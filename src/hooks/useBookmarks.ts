import { useState, useCallback } from 'react'
import type { Bookmark } from '../types'
import { getBookmarks, insertBookmark, deleteBookmark } from '../db/bookmarks'
import { v4 as uuidv4 } from 'uuid'

export function useBookmarks(bookId: string) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  const load = useCallback(async () => {
    const bm = await getBookmarks(bookId)
    setBookmarks(bm)
  }, [bookId])

  const addBookmark = useCallback(async (position: string, label: string) => {
    const b: Bookmark = { id: uuidv4(), bookId, position, label, createdAt: Date.now() }
    await insertBookmark(b)
    setBookmarks(prev => [...prev, b])
    return b
  }, [bookId])

  const removeBookmark = useCallback(async (id: string) => {
    await deleteBookmark(id, bookId)
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }, [bookId])

  return { bookmarks, load, addBookmark, removeBookmark }
}
