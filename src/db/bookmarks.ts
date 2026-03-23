import { Preferences } from '@capacitor/preferences'
import type { Bookmark } from '../types'

export async function getBookmarks(bookId: string): Promise<Bookmark[]> {
  const { value } = await Preferences.get({ key: `lekto.bookmarks.${bookId}` })
  if (!value) return []
  try { return JSON.parse(value) as Bookmark[] } catch { return [] }
}

export async function insertBookmark(b: Bookmark): Promise<void> {
  const bookmarks = await getBookmarks(b.bookId)
  bookmarks.push(b)
  await Preferences.set({ key: `lekto.bookmarks.${b.bookId}`, value: JSON.stringify(bookmarks) })
}

export async function deleteBookmark(id: string, bookId: string): Promise<void> {
  const bookmarks = await getBookmarks(bookId)
  await Preferences.set({ key: `lekto.bookmarks.${bookId}`, value: JSON.stringify(bookmarks.filter(b => b.id !== id)) })
}
