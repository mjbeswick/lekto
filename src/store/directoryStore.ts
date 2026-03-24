import { create } from 'zustand'
import type { Book, DirectorySource } from '../types'
import { getAllDirectories, insertDirectory, updateDirectory, deleteDirectory } from '../db/directories'
import {
  pickAndScanNativeDirectory,
  pickAndScanWebDirectory,
  rescanNativeDirectory,
  rescanWebDirectory,
} from '../utils/directoryScanner'
import { getDirHandle, removeDirHandle, removeWebFile } from '../utils/fileStore'
import { isWeb } from '../platform'

export interface ScanResult {
  toAdd: Book[]
  toRemoveIds: string[]
  source: DirectorySource
}

interface DirectoryState {
  directories: DirectorySource[]
  scanning: boolean
  loadDirectories: () => Promise<void>
  /**
   * Prompt the user to pick a directory, scan it and return the result.
   * The caller is responsible for persisting books via the library store.
   * Returns null if cancelled or unsupported.
   */
  addDirectory: (collectionId?: string) => Promise<ScanResult | null>
  /**
   * Re-scan a directory and return a diff against existing books.
   * @param existingBooks - The caller passes all books currently from this directory.
   */
  refreshDirectory: (id: string, existingBooks: Book[]) => Promise<ScanResult | null>
  removeDirectory: (id: string, existingBooks: Book[]) => Promise<string[]>
}

export const useDirectoryStore = create<DirectoryState>((set, get) => ({
  directories: [],
  scanning: false,

  loadDirectories: async () => {
    const directories = await getAllDirectories()
    set({ directories })
  },

  addDirectory: async (collectionId) => {
    set({ scanning: true })
    try {
      const result = isWeb()
        ? await pickAndScanWebDirectory(collectionId)
        : await pickAndScanNativeDirectory(collectionId)

      if (!result) return null

      await insertDirectory(result.source)
      set(s => ({ directories: [...s.directories, result.source] }))
      return { toAdd: result.books, toRemoveIds: [], source: result.source }
    } finally {
      set({ scanning: false })
    }
  },

  refreshDirectory: async (id, existingBooks) => {
    set({ scanning: true })
    try {
      const { directories } = get()
      const source = directories.find(d => d.id === id)
      if (!source) return null

      let result: { source: DirectorySource; books: Book[] } | null

      if (isWeb()) {
        const handle = await getDirHandle(id)
        result = await rescanWebDirectory(handle, source)
      } else {
        result = await rescanNativeDirectory(source)
      }

      if (!result) return null

      // Diff: find removed books (in existing but path no longer in scan)
      const scannedPaths = new Set(result.books.map(b => b.filePath))
      const toRemoveIds = existingBooks
        .filter(b => !scannedPaths.has(b.filePath))
        .map(b => b.id)

      // De-dup: skip books we already have (same filePath)
      const existingPaths = new Set(existingBooks.map(b => b.filePath))
      const toAdd = result.books.filter(b => !existingPaths.has(b.filePath))

      // Persist updated source metadata
      const updatedSource = await updateDirectory(id, {
        lastScanned: result.source.lastScanned,
        bookCount: result.source.bookCount,
      })

      set(s => ({
        directories: s.directories.map(d => (d.id === id ? (updatedSource ?? result!.source) : d)),
      }))

      return { toAdd, toRemoveIds, source: updatedSource ?? result.source }
    } finally {
      set({ scanning: false })
    }
  },

  removeDirectory: async (id, existingBooks) => {
    // On web, also clean up IDB bytes for every book from this directory
    if (isWeb()) {
      await Promise.all(existingBooks.map(b => removeWebFile(b.id)))
      await removeDirHandle(id)
    }
    await deleteDirectory(id)
    set(s => ({ directories: s.directories.filter(d => d.id !== id) }))
    return existingBooks.map(b => b.id)
  },
}))
