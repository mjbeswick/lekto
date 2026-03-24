import { Preferences } from '@capacitor/preferences'
import type { Book } from '../types'
import { removeWebFile } from '../utils/fileStore'

const KEY = 'lekto.books'

function sameStoredPath(left: string, right: string): boolean {
  return left.trim() === right.trim()
}

export async function getAllBooks(): Promise<Book[]> {
  const { value } = await Preferences.get({ key: KEY })
  if (!value) return []
  try { return JSON.parse(value) as Book[] } catch { return [] }
}

export async function getBook(id: string): Promise<Book | null> {
  const books = await getAllBooks()
  return books.find(b => b.id === id) ?? null
}

export async function insertBook(book: Book): Promise<Book> {
  const books = await getAllBooks()
  const existing = books.find(item => sameStoredPath(item.filePath, book.filePath))
  if (existing) return existing
  books.unshift(book)
  await Preferences.set({ key: KEY, value: JSON.stringify(books) })
  return book
}

export async function updateBook(id: string, patch: Partial<Book>): Promise<Book | null> {
  const books = await getAllBooks()
  let updatedBook: Book | null = null
  const updated = books.map(book => {
    if (book.id !== id) return book
    updatedBook = { ...book, ...patch }
    return updatedBook
  })
  if (!updatedBook) return null
  await Preferences.set({ key: KEY, value: JSON.stringify(updated) })
  return updatedBook
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
