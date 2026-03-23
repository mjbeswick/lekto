export type BookFormat = 'md' | 'epub' | 'txt'
export type Theme = 'light' | 'dark' | 'amoled' | 'sepia'

export interface Book {
  id: string
  title: string
  author: string
  filePath: string
  format: BookFormat
  coverUri?: string
  addedAt: number
  lastOpenedAt?: number
}

export interface ReadingProgress {
  bookId: string
  position: string   // CFI for epub, char offset string for md
  percent: number
  updatedAt: number
}

export interface Highlight {
  id: string
  bookId: string
  cfiStart: string
  cfiEnd: string
  text: string
  color: string
  createdAt: number
}

export interface Note {
  id: string
  highlightId?: string
  bookId: string
  text: string
  createdAt: number
}

export interface Bookmark {
  id: string
  bookId: string
  position: string   // same format as ReadingProgress.position
  label: string      // snippet or page label
  createdAt: number
}
