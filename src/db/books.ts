import { Preferences } from '@capacitor/preferences'
import type { Book } from '../types'
import { removeWebFile } from '../utils/fileStore'

const KEY = 'lekto.books'

export async function getAllBooks(): Promise<Book[]> {
  const { value } = await Preferences.get({ key: KEY })
  if (!value) return []
  try { return JSON.parse(value) as Book[] } catch { return [] }
}

export async function getBook(id: string): Promise<Book | null> {
  const books = await getAllBooks()
  return books.find(b => b.id === id) ?? null
}

export async function insertBook(book: Book): Promise<void> {
  const books = await getAllBooks()
  books.unshift(book)
  await Preferences.set({ key: KEY, value: JSON.stringify(books) })
}

export async function deleteBook(id: string): Promise<void> {
  const books = await getAllBooks()
  await Preferences.set({ key: KEY, value: JSON.stringify(books.filter(b => b.id !== id)) })
  await Preferences.remove({ key: `lekto.progress.${id}` })
  await Preferences.remove({ key: `lekto.highlights.${id}` })
  await Preferences.remove({ key: `lekto.notes.${id}` })
  await removeWebFile(id)
}

export async function updateLastOpened(id: string): Promise<void> {
  const books = await getAllBooks()
  const updated = books.map(b => b.id === id ? { ...b, lastOpenedAt: Date.now() } : b)
  await Preferences.set({ key: KEY, value: JSON.stringify(updated) })
}
