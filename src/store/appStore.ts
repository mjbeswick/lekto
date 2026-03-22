import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '../types'

interface AppState {
  theme: Theme
  fontSize: number
  fontFamily: string
  lineHeight: number
  defaultWpm: number
  wordLengthScaling: boolean
  rsvpChunkLetters: number
  setTheme: (t: Theme) => void
  setFontSize: (n: number) => void
  setFontFamily: (f: string) => void
  setLineHeight: (n: number) => void
  setDefaultWpm: (n: number) => void
  setWordLengthScaling: (v: boolean) => void
  setRsvpChunkLetters: (n: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      fontSize: 18,
      fontFamily: 'serif',
      lineHeight: 1.7,
      defaultWpm: 300,
      wordLengthScaling: true,
      rsvpChunkLetters: 1,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setDefaultWpm: (defaultWpm) => set({ defaultWpm }),
      setWordLengthScaling: (wordLengthScaling) => set({ wordLengthScaling }),
      setRsvpChunkLetters: (rsvpChunkLetters) => set({ rsvpChunkLetters }),
    }),
    { name: 'lekto-settings' }
  )
)
