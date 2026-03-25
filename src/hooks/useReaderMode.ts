import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ReaderMode = 'ebook' | 'speed'
export type EbookLayout = 'scroll' | 'pages'

interface ReaderModeState {
  mode: ReaderMode
  layout: EbookLayout
  ttsOpen: boolean
  setMode: (m: ReaderMode) => void
  setLayout: (l: EbookLayout) => void
  setTtsOpen: (open: boolean) => void
  toggleMode: () => void
  toggleLayout: () => void
}

// Per-session store (not persisted — mode resets on open)
export const useReaderModeStore = create<ReaderModeState>()(
  persist(
    (set) => ({
      mode: 'ebook',
      layout: 'pages',
      ttsOpen: false,
      setMode: (mode) => set({ mode }),
      setLayout: (layout) => set({ layout }),
      setTtsOpen: (ttsOpen) => set({ ttsOpen }),
      toggleMode: () => set((s) => ({ mode: s.mode === 'ebook' ? 'speed' : 'ebook' })),
      toggleLayout: () => set((s) => ({ layout: s.layout === 'scroll' ? 'pages' : 'scroll' })),
    }),
    { name: 'lekto-reader-mode' }
  )
)
