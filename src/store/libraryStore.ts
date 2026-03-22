import { create } from 'zustand'
import type { Book } from '../types'
import { getAllBooks, insertBook, deleteBook } from '../db/books'

interface LibraryState {
  books: Book[]
  loading: boolean
  loadBooks: () => Promise<void>
  addBook: (book: Book) => Promise<void>
  removeBook: (id: string) => Promise<void>
}

export const useLibraryStore = create<LibraryState>((set) => ({
  books: [],
  loading: false,
  loadBooks: async () => {
    set({ loading: true })
    const books = await getAllBooks()
    set({ books, loading: false })
  },
  addBook: async (book) => {
    await insertBook(book)
    set((s) => ({ books: [book, ...s.books] }))
  },
  removeBook: async (id) => {
    await deleteBook(id)
    set((s) => ({ books: s.books.filter(b => b.id !== id) }))
  },
}))
