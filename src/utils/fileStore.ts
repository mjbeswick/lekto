import { Capacitor } from '@capacitor/core'
import { Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'

const isWeb = () => !Capacitor.isNativePlatform()

// ─── Shared helper ────────────────────────────────────────────────────────────
export function b64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// ─── IndexedDB (web) ─────────────────────────────────────────────────────────
// Files are stored as raw ArrayBuffers, so there is no practical size limit
// (unlike the ~10 MB cap of localStorage / Capacitor Preferences).

let _db: IDBDatabase | null = null

function getDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('lekto-files', 2)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('files'))
        req.result.createObjectStore('files')
      if (!req.result.objectStoreNames.contains('dir-handles'))
        req.result.createObjectStore('dir-handles')
    }
    req.onsuccess = () => {
      _db = req.result
      _db.onclose = () => { _db = null }
      resolve(_db)
    }
    req.onerror = () => reject(req.error)
  })
}

function idbPut(key: string, buf: ArrayBuffer): Promise<void> {
  return getDb().then(db => new Promise((res, rej) => {
    const tx = db.transaction('files', 'readwrite')
    tx.objectStore('files').put(buf, key)
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  }))
}

function idbGet(key: string): Promise<ArrayBuffer | null> {
  return getDb().then(db => new Promise((res, rej) => {
    const req = db.transaction('files').objectStore('files').get(key)
    req.onsuccess = () => res(req.result ?? null)
    req.onerror = () => rej(req.error)
  }))
}

function idbDelete(key: string): Promise<void> {
  return getDb().then(db => new Promise((res, rej) => {
    const tx = db.transaction('files', 'readwrite')
    tx.objectStore('files').delete(key)
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  }))
}

// ─── Path helpers ─────────────────────────────────────────────────────────────
export function webFilePath(bookId: string): string { return `web:${bookId}` }
function webKey(filePath: string): string {
  return filePath.startsWith('web:') ? filePath.slice(4) : filePath
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Persist file bytes at import time.
 * Accepts ArrayBuffer (from FileReader.readAsArrayBuffer) or base64 (native FilePicker).
 */
export async function storeWebFile(bookId: string, data: ArrayBuffer | string): Promise<void> {
  const buf = typeof data === 'string' ? b64ToBuffer(data) : data
  await idbPut(bookId, buf)
}

/** Remove stored file bytes when a book is deleted. */
export async function removeWebFile(bookId: string): Promise<void> {
  await idbDelete(bookId)
  await Preferences.remove({ key: `lekto.file.${bookId}` }).catch(() => {})
}

/**
 * Read a file as ArrayBuffer.
 * Web:    IndexedDB first; falls back to legacy Preferences and auto-migrates.
 * Native: Capacitor Filesystem.
 */
export async function readFileAsArrayBuffer(filePath: string): Promise<ArrayBuffer> {
  if (isWeb()) {
    const key = webKey(filePath)
    const buf = await idbGet(key)
    if (buf) return buf
    // Legacy migration: Preferences → IndexedDB (one-time, then removes old entry)
    const { value } = await Preferences.get({ key: `lekto.file.${key}` })
    if (value) {
      const buffer = b64ToBuffer(value)
      await idbPut(key, buffer)
      await Preferences.remove({ key: `lekto.file.${key}` })
      return buffer
    }
    return new ArrayBuffer(0)
  }
  const result = await Filesystem.readFile({ path: filePath })
  if (typeof result.data === 'string') return b64ToBuffer(result.data)
  return result.data as unknown as ArrayBuffer
}

/**
 * Read a file as UTF-8 text (for .md / .txt).
 */
export async function readFileContent(filePath: string): Promise<string> {
  if (isWeb()) {
    const buf = await readFileAsArrayBuffer(filePath)
    return buf.byteLength ? new TextDecoder('utf-8').decode(buf) : ''
  }
  const result = await Filesystem.readFile({ path: filePath })
  const raw = result.data
  if (typeof raw === 'string') {
    try { return atob(raw) } catch { return raw }
  }
  return new TextDecoder().decode(raw as unknown as ArrayBuffer)
}

// ─── Directory handle storage (web only) ─────────────────────────────────────
// FileSystemDirectoryHandle instances are structured-cloneable and can live in IDB.

function getDirHandleStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return getDb().then(db => db.transaction('dir-handles', mode).objectStore('dir-handles'))
}

export async function storeDirHandle(dirId: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const store = await getDirHandleStore('readwrite')
  await new Promise<void>((res, rej) => {
    const req = store.put(handle, dirId)
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}

export async function getDirHandle(dirId: string): Promise<FileSystemDirectoryHandle | null> {
  const store = await getDirHandleStore('readonly')
  return new Promise((res, rej) => {
    const req = store.get(dirId)
    req.onsuccess = () => res((req.result as FileSystemDirectoryHandle) ?? null)
    req.onerror = () => rej(req.error)
  })
}

export async function removeDirHandle(dirId: string): Promise<void> {
  try {
    const store = await getDirHandleStore('readwrite')
    await new Promise<void>((res, rej) => {
      const req = store.delete(dirId)
      req.onsuccess = () => res()
      req.onerror = () => rej(req.error)
    })
  } catch { /* ignore */ }
}
