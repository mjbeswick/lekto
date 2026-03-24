import { create } from 'zustand'
import type { Book } from '../types'
import { getAllBooks, insertBook, deleteBook, updateBook as persistBookUpdate } from '../db/books'

interface LibraryState {
  books: Book[]
  loading: boolean
  loadBooks: () => Promise<void>
  addBook: (book: Book) => Promise<Book>
  updateBook: (id: string, patch: Partial<Book>) => Promise<void>
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
    const storedBook = await insertBook(book)
    set((s) => {
      const existingIndex = s.books.findIndex(item => item.id === storedBook.id || item.filePath === storedBook.filePath)
      if (existingIndex >= 0) {
        const nextBooks = [...s.books]
        nextBooks[existingIndex] = storedBook
        return { books: nextBooks }
      }
      return { books: [storedBook, ...s.books] }
    })
    return storedBook
  },
  updateBook: async (id, patch) => {
    const updatedBook = await persistBookUpdate(id, patch)
    if (!updatedBook) return
    set((s) => ({ books: s.books.map(book => book.id === id ? updatedBook : book) }))
  },
  removeBook: async (id) => {
    await deleteBook(id)
    set((s) => ({ books: s.books.filter(b => b.id !== id) }))
  },
}))
