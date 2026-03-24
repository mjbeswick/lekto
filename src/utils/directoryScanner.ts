import { Filesystem } from '@capacitor/filesystem'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import { v4 as uuidv4 } from 'uuid'
import type { Book, BookFormat, DirectorySource } from '../types'
import { parseEpubMeta } from './epubParser'
import { parsePdfMeta } from './pdfParser'
import { parseFb2Meta } from './fb2Parser'
import { parseDocxMeta } from './docxParser'
import { parseMdMeta } from './markdownMeta'
import { b64ToBuffer, getDirHandle, storeDirHandle, storeWebFile, webFilePath } from './fileStore'

const SUPPORTED_EXTS = new Set(['md', 'epub', 'txt', 'pdf', 'docx', 'fb2'])

function getExt(name: string): BookFormat | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.fb2.zip')) return 'fb2'
  const ext = lower.split('.').pop()
  return ext && SUPPORTED_EXTS.has(ext) ? (ext as BookFormat) : null
}

async function buildMeta(
  ext: BookFormat,
  data: ArrayBuffer,
  fallbackTitle: string,
): Promise<{ title: string; author: string; coverUri?: string }> {
  let title = fallbackTitle
  let author = ''
  let coverUri: string | undefined
  try {
    if (ext === 'epub') {
      const meta = await parseEpubMeta(data)
      title = meta.title || title; author = meta.author; coverUri = meta.coverBase64
    } else if (ext === 'pdf') {
      const meta = await parsePdfMeta(data)
      title = meta.title || title; author = meta.author; coverUri = meta.coverBase64
    } else if (ext === 'fb2') {
      const meta = await parseFb2Meta(data)
      title = meta.title || title; author = meta.author; coverUri = meta.coverBase64
    } else if (ext === 'docx') {
      const meta = await parseDocxMeta(data)
      title = meta.title || title; author = meta.author
    } else {
      const meta = parseMdMeta(new TextDecoder('utf-8').decode(data))
      title = meta.title || title; author = meta.author
    }
  } catch { /* keep fallbacks */ }
  return { title, author, coverUri }
}

// ─── Native ──────────────────────────────────────────────────────────────────

/**
 * On native: pick files via FilePicker, derive the parent directory from the
 * first file's path, then scan that entire directory via Filesystem.readdir.
 * Returns null if the user cancels or no supported files are found.
 */
export async function pickAndScanNativeDirectory(
  collectionId?: string,
): Promise<{ source: DirectorySource; books: Book[] } | null> {
  let files: { name: string; path?: string; data?: string }[]
  try {
    const result = await FilePicker.pickFiles({ limit: 0, readData: false })
    files = result.files
  } catch {
    return null
  }

  if (!files.length) return null

  // Derive directory path from first file path
  const firstPath = files[0].path
  if (!firstPath) return null
  const dirPath = firstPath.substring(0, firstPath.lastIndexOf('/'))
  const dirName = dirPath.split('/').filter(Boolean).pop() ?? dirPath

  const dirId = uuidv4()
  return rescanNativeDirectory({ id: dirId, name: dirName, path: dirPath, addedAt: Date.now(), lastScanned: 0, bookCount: 0, collectionId })
}

/**
 * Re-scan a native directory using the stored path.
 * Returns the DirectorySource (with updated counts) and all file books found.
 */
export async function rescanNativeDirectory(
  source: DirectorySource,
): Promise<{ source: DirectorySource; books: Book[] } | null> {
  let entries: { name: string }[]
  try {
    const result = await Filesystem.readdir({ path: source.path })
    entries = result.files.map(f => ({ name: typeof f === 'string' ? f : f.name }))
  } catch {
    return null
  }

  const books: Book[] = []

  for (const entry of entries) {
    const ext = getExt(entry.name)
    if (!ext) continue
    const filePath = `${source.path}/${entry.name}`
    const fallbackTitle = entry.name.replace(/\.[^.]+$/, '')

    let data: ArrayBuffer
    try {
      const result = await Filesystem.readFile({ path: filePath })
      data = typeof result.data === 'string' ? b64ToBuffer(result.data) : (result.data as unknown as ArrayBuffer)
    } catch {
      continue
    }

    const meta = await buildMeta(ext, data, fallbackTitle)
    books.push({
      id: uuidv4(),
      title: meta.title,
      author: meta.author,
      filePath,
      format: ext,
      coverUri: meta.coverUri,
      addedAt: Date.now(),
      sourceType: 'directory',
      directoryId: source.id,
      collectionId: source.collectionId,
      fileSize: data.byteLength,
    })
  }

  return {
    source: { ...source, lastScanned: Date.now(), bookCount: books.length },
    books,
  }
}

// ─── Web ─────────────────────────────────────────────────────────────────────

/**
 * Open a directory picker, scan its contents and copy bytes to IndexedDB.
 * Returns null if the browser doesn't support the API or the user cancels.
 */
export async function pickAndScanWebDirectory(
  collectionId?: string,
): Promise<{ source: DirectorySource; books: Book[] } | null> {
  if (!('showDirectoryPicker' in window)) return null
  let handle: FileSystemDirectoryHandle
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handle = await (window as any).showDirectoryPicker({ mode: 'read' })
  } catch {
    return null
  }
  const dirId = uuidv4()
  return rescanWebDirectory(handle, { id: dirId, name: handle.name, path: `web:dir:${dirId}`, addedAt: Date.now(), lastScanned: 0, bookCount: 0, collectionId })
}

/**
 * Re-scan a web directory.  Attempts to retrieve the stored handle; if the
 * permission has expired the user will be prompted to re-pick.
 */
export async function rescanWebDirectory(
  handleOrNull: FileSystemDirectoryHandle | null | undefined,
  source: DirectorySource,
): Promise<{ source: DirectorySource; books: Book[] } | null> {
  if (!('showDirectoryPicker' in window)) return null

  let handle: FileSystemDirectoryHandle | null = handleOrNull ?? await getDirHandle(source.id)
  if (!handle) {
    // Permission lost — ask the user to re-pick the same folder
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handle = (await (window as any).showDirectoryPicker({ mode: 'read' })) as FileSystemDirectoryHandle
    } catch {
      return null
    }
  }

  // Verify (or re-request) read permission
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perm = await (handle! as any).queryPermission?.({ mode: 'read' })
  if (perm === 'prompt' || perm === 'denied') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const granted = await (handle! as any).requestPermission?.({ mode: 'read' })
    if (granted !== 'granted') return null
  }

  await storeDirHandle(source.id, handle!)

  const books: Book[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const [name, entry] of (handle as any).entries()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((entry as any).kind !== 'file') continue
    const ext = getExt(name as string)
    if (!ext) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file: File = await (entry as any).getFile()
    const buffer = await file.arrayBuffer()
    const id = uuidv4()
    await storeWebFile(id, buffer)
    const fallbackTitle = (name as string).replace(/\.[^.]+$/, '')
    const meta = await buildMeta(ext, buffer, fallbackTitle)
    books.push({
      id,
      title: meta.title,
      author: meta.author,
      filePath: webFilePath(id),
      format: ext,
      coverUri: meta.coverUri,
      addedAt: Date.now(),
      sourceType: 'directory',
      directoryId: source.id,
      collectionId: source.collectionId,
      fileSize: file.size,
    })
  }

  return {
    source: { ...source, name: handle.name, lastScanned: Date.now(), bookCount: books.length },
    books,
  }
}
