import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import LibraryPage from './pages/LibraryPage'
import ReaderPage from './pages/ReaderPage'
import SettingsPage from './pages/SettingsPage'
import FileBrowserPage from './pages/FileBrowserPage'
import { useAppStore } from './store/appStore'
import { parseEpubMeta } from './utils/epubParser'
import { parseMdMeta } from './utils/markdownMeta'
import { useLibraryStore } from './store/libraryStore'
import { Filesystem } from '@capacitor/filesystem'
import type { Book, BookFormat } from './types'
import { v4 as uuidv4 } from 'uuid'

function AppInner() {
  const theme = useAppStore(s => s.theme)
  const accentColor = useAppStore(s => s.accentColor)
  const { addBook } = useLibraryStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true })
      StatusBar.setStyle({ style: Style.Default })
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--reader-accent', accentColor)
  }, [accentColor])

  useEffect(() => {
    const listener = CapApp.addListener('appUrlOpen', async (event) => {
      const url = event.url
      if (!url) return
      const ext = url.split('.').pop()?.toLowerCase().split('?')[0] as BookFormat
      if (ext !== 'md' && ext !== 'epub') return

      try {
        const file = await Filesystem.readFile({ path: url })
        const data = typeof file.data === 'string' ? file.data : ''
        let title = url.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'Untitled'
        let author = ''
        let coverUri: string | undefined

        if (ext === 'epub' && data) {
          try { const m = await parseEpubMeta(data); title = m.title || title; author = m.author; coverUri = m.coverBase64 } catch {}
        } else if (ext === 'md' && data) {
          try { const m = parseMdMeta(atob(data)); title = m.title || title; author = m.author } catch {}
        }

        const book: Book = { id: uuidv4(), title, author, filePath: url, format: ext, coverUri, addedAt: Date.now() }
        await addBook(book)
        navigate(`/reader/${book.id}`)
      } catch (e) {
        console.error('appUrlOpen error', e)
      }
    })
    return () => { listener.then(l => l.remove()) }
  }, [addBook, navigate])

  return (
    <div
      className={`theme-${theme} ${theme === 'dark' || theme === 'amoled' ? 'dark' : ''} h-full overflow-hidden`}
      style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)', minHeight: '100dvh' }}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/library" replace />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/browse" element={<FileBrowserPage />} />
        <Route path="/reader/:bookId" element={<ReaderPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return <AppInner />
}
