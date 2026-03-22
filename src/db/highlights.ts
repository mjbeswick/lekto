import { Preferences } from '@capacitor/preferences'
import type { Highlight, Note } from '../types'

export async function getHighlights(bookId: string): Promise<Highlight[]> {
  const { value } = await Preferences.get({ key: `lekto.highlights.${bookId}` })
  if (!value) return []
  try { return JSON.parse(value) as Highlight[] } catch { return [] }
}

export async function insertHighlight(h: Highlight): Promise<void> {
  const highlights = await getHighlights(h.bookId)
  highlights.push(h)
  await Preferences.set({ key: `lekto.highlights.${h.bookId}`, value: JSON.stringify(highlights) })
}

export async function deleteHighlight(id: string, bookId: string): Promise<void> {
  const highlights = await getHighlights(bookId)
  await Preferences.set({ key: `lekto.highlights.${bookId}`, value: JSON.stringify(highlights.filter(h => h.id !== id)) })
}

export async function getNotes(bookId: string): Promise<Note[]> {
  const { value } = await Preferences.get({ key: `lekto.notes.${bookId}` })
  if (!value) return []
  try { return JSON.parse(value) as Note[] } catch { return [] }
}

export async function insertNote(n: Note): Promise<void> {
  const notes = await getNotes(n.bookId)
  notes.push(n)
  await Preferences.set({ key: `lekto.notes.${n.bookId}`, value: JSON.stringify(notes) })
}
