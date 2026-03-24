export type BookFormat = 'md' | 'epub' | 'txt' | 'pdf' | 'docx' | 'fb2'
export type Theme = 'light' | 'dark' | 'amoled' | 'sepia'

export interface Collection {
  id: string
  name: string
  createdAt: number
  order: number
}

export interface Book {
  id: string
  title: string
  author: string
  filePath: string
  format: BookFormat
  coverUri?: string
  addedAt: number
  lastOpenedAt?: number
  collectionId?: string
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
