import { Preferences } from '@capacitor/preferences'
import type { ReadingProgress } from '../types'

export async function getProgress(bookId: string): Promise<ReadingProgress | null> {
  const { value } = await Preferences.get({ key: `lekto.progress.${bookId}` })
  if (!value) return null
  try { return JSON.parse(value) as ReadingProgress } catch { return null }
}

export async function saveProgress(p: ReadingProgress): Promise<void> {
  await Preferences.set({ key: `lekto.progress.${p.bookId}`, value: JSON.stringify(p) })
}
