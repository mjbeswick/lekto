import { useState, useCallback } from 'react'
import type { Highlight, Note } from '../types'
import { getHighlights, insertHighlight, deleteHighlight, getNotes, insertNote } from '../db/highlights'
import { v4 as uuidv4 } from 'uuid'

export function useHighlights(bookId: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [notes, setNotes] = useState<Note[]>([])

  const load = useCallback(async () => {
    const [hl, no] = await Promise.all([getHighlights(bookId), getNotes(bookId)])
    setHighlights(hl)
    setNotes(no)
  }, [bookId])

  const addHighlight = useCallback(async (cfiStart: string, cfiEnd: string, text: string, color = '#ffeb3b') => {
    const h: Highlight = { id: uuidv4(), bookId, cfiStart, cfiEnd, text, color, createdAt: Date.now() }
    await insertHighlight(h)
    setHighlights(prev => [...prev, h])
    return h
  }, [bookId])

  const removeHighlight = useCallback(async (id: string) => {
    await deleteHighlight(id, bookId)
    setHighlights(prev => prev.filter(h => h.id !== id))
  }, [bookId])

  const addNote = useCallback(async (text: string, highlightId?: string) => {
    const n: Note = { id: uuidv4(), bookId, highlightId, text, createdAt: Date.now() }
    await insertNote(n)
    setNotes(prev => [...prev, n])
  }, [bookId])

  return { highlights, notes, load, addHighlight, removeHighlight, addNote }
}
