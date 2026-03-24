import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ReaderMode = 'ebook' | 'speed' | 'tts'
export type EbookLayout = 'scroll' | 'pages'

interface ReaderModeState {
  mode: ReaderMode
  layout: EbookLayout
  setMode: (m: ReaderMode) => void
  setLayout: (l: EbookLayout) => void
  toggleMode: () => void
  toggleLayout: () => void
}

// Per-session store (not persisted — mode resets on open)
export const useReaderModeStore = create<ReaderModeState>()(
  persist(
    (set) => ({
      mode: 'ebook',
      layout: 'scroll',
      setMode: (mode) => set({ mode }),
      setLayout: (layout) => set({ layout }),
      toggleMode: () => set((s) => ({ mode: s.mode === 'ebook' ? 'speed' : 'ebook' })),
      toggleLayout: () => set((s) => ({ layout: s.layout === 'scroll' ? 'pages' : 'scroll' })),
    }),
    { name: 'lekto-reader-mode' }
  )
)
