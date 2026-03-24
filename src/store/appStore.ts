import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '../types'

interface AppState {
  theme: Theme
  accentColor: string
  fontSize: number
  fontFamily: string
  lineHeight: number
  paragraphSpacing: number
  maxWidth: boolean
  libraryView: 'list' | 'grid'
  defaultWpm: number
  wordLengthScaling: boolean
  rsvpChunkLetters: number
  rsvpShowContext: boolean
  rsvpFontSize: number
  setTheme: (t: Theme) => void
  setAccentColor: (c: string) => void
  setFontSize: (n: number) => void
  setFontFamily: (f: string) => void
  setLineHeight: (n: number) => void
  setParagraphSpacing: (n: number) => void
  setMaxWidth: (v: boolean) => void
  setLibraryView: (v: 'list' | 'grid') => void
  setDefaultWpm: (n: number) => void
  setWordLengthScaling: (v: boolean) => void
  setRsvpChunkLetters: (n: number) => void
  setRsvpShowContext: (v: boolean) => void
  setRsvpFontSize: (n: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      accentColor: '#f97316',
      fontSize: 18,
      fontFamily: 'serif',
      lineHeight: 1.7,
      paragraphSpacing: 1,
      maxWidth: true,
      libraryView: 'list',
      defaultWpm: 300,
      wordLengthScaling: true,
      rsvpChunkLetters: 1,
      rsvpShowContext: true,
      rsvpFontSize: 52,
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setParagraphSpacing: (paragraphSpacing) => set({ paragraphSpacing }),
      setMaxWidth: (maxWidth) => set({ maxWidth }),
      setLibraryView: (libraryView) => set({ libraryView }),
      setDefaultWpm: (defaultWpm) => set({ defaultWpm }),
      setWordLengthScaling: (wordLengthScaling) => set({ wordLengthScaling }),
      setRsvpChunkLetters: (rsvpChunkLetters) => set({ rsvpChunkLetters }),
      setRsvpShowContext: (rsvpShowContext) => set({ rsvpShowContext }),
      setRsvpFontSize: (rsvpFontSize) => set({ rsvpFontSize }),
    }),
    { name: 'lekto-settings' }
  )
)
