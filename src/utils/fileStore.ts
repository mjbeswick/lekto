import { Capacitor } from '@capacitor/core'
import { Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'

export const isWeb = () => !Capacitor.isNativePlatform()

/** Read a file as a UTF-8 string.
 *  - Native: reads from the absolute file URI stored in book.filePath
 *  - Web:    reads base64 content stored in Preferences under lekto.file.{bookId}
 */
function base64ToUtf8(b64: string): string {
  try {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return b64
  }
}

export async function readFileContent(filePath: string): Promise<string> {
  if (isWeb()) {
    const key = filePath.startsWith('web:') ? filePath.slice(4) : filePath
    const { value } = await Preferences.get({ key: `lekto.file.${key}` })
    if (!value) return ''
    return base64ToUtf8(value)
  }
  const result = await Filesystem.readFile({ path: filePath })
  const raw = result.data
  if (typeof raw === 'string') {
    try { return atob(raw) } catch { return raw }
  }
  return new TextDecoder().decode(raw as unknown as ArrayBuffer)
}

/** Read a file as an ArrayBuffer (decoded once from base64 storage). */
export async function readFileAsArrayBuffer(filePath: string): Promise<ArrayBuffer> {
  const b64ToBuffer = (b64: string): ArrayBuffer => {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  }
  if (isWeb()) {
    const key = filePath.startsWith('web:') ? filePath.slice(4) : filePath
    const { value } = await Preferences.get({ key: `lekto.file.${key}` })
    return value ? b64ToBuffer(value) : new ArrayBuffer(0)
  }
  const result = await Filesystem.readFile({ path: filePath })
  if (typeof result.data === 'string') return b64ToBuffer(result.data)
  return result.data as unknown as ArrayBuffer
}

/** Persist web file content (base64). Called at import time on web. */
export async function storeWebFile(bookId: string, base64: string): Promise<void> {
  await Preferences.set({ key: `lekto.file.${bookId}`, value: base64 })
}

/** Remove web file content when a book is deleted. */
export async function removeWebFile(bookId: string): Promise<void> {
  await Preferences.remove({ key: `lekto.file.${bookId}` })
}

/** Build the filePath value for a web-imported book. */
export function webFilePath(bookId: string): string {
  return `web:${bookId}`
}
