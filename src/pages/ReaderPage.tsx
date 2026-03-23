import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getBook, updateLastOpened } from '../db/books'
import { getProgress, saveProgress } from '../db/progress'
import type { Book } from '../types'
import MarkdownReader from '../components/Reader/MarkdownReader'
import PaginatedReader from '../components/Reader/PaginatedReader'
import EpubReader, { type TocItem } from '../components/Reader/EpubReader'
import ContentPanel from '../components/Reader/ContentPanel'
import ReaderToolbar from '../components/Reader/ReaderToolbar'
import SpeedReaderView from '../components/SpeedReader/SpeedReaderView'
import { stripMarkdown } from '../utils/textTokenizer'
import { useBookmarks } from '../hooks/useBookmarks'
import { useReaderModeStore } from '../hooks/useReaderMode'
import { readFileContent, readFileAsArrayBuffer } from '../utils/fileStore'
import { extractEpubText } from '../utils/epubParser'

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const [book, setBook] = useState<Book | null>(null)
  const [mdContent, setMdContent] = useState('')
  const [epubBuffer, setEpubBuffer] = useState<ArrayBuffer | null>(null)
  const epubExtractedRef = useRef(false)
  const [plainText, setPlainText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [initialOffset, setInitialOffset] = useState(0)
  const [initialPage, setInitialPage] = useState(0)
  const [initialCfi, setInitialCfi] = useState<string | undefined>()
  const [readerKey, setReaderKey] = useState(0)
  const [showPanel, setShowPanel] = useState(false)
  const [toc, setToc] = useState<TocItem[]>([])
  const renditionRef = useRef<any>(null)
  const currentPositionRef = useRef<string>('')

  const { mode, layout, toggleMode } = useReaderModeStore()
  const { bookmarks, load: loadBookmarks, addBookmark, removeBookmark } = useBookmarks(bookId ?? '')

  useEffect(() => {
    if (!bookId) return
    ;(async () => {
      const b = await getBook(bookId)
      if (!b) return
      setBook(b)
      await updateLastOpened(bookId)
      await loadBookmarks()

      const saved = await getProgress(bookId)

      if (b.format === 'epub') {
        const buffer = await readFileAsArrayBuffer(b.filePath)
        setEpubBuffer(buffer)
        if (saved) setInitialCfi(saved.position)
      } else {
        const text = await readFileContent(b.filePath)
        setMdContent(text)
        setPlainText(stripMarkdown(text))
        if (saved) {
          if (saved.position.startsWith('page:')) {
            setInitialPage(parseInt(saved.position.slice(5)) || 0)
          } else {
            setInitialOffset(Number(saved.position.replace('scroll:', '')) || 0)
          }
        }
      }
    })()
  }, [bookId])

  // Lazy EPUB text extraction — only triggered when speed reader is first activated
  useEffect(() => {
    if (mode !== 'speed' || !epubBuffer || epubExtractedRef.current) return
    epubExtractedRef.current = true
    setExtracting(true)
    extractEpubText(epubBuffer)
      .then(text => setPlainText(text))
      .catch(err => console.error('[Lekto] EPUB text extraction failed:', err))
      .finally(() => setExtracting(false))
  }, [mode, epubBuffer])

  const handleScrollProgress = useCallback(async (offset: number, percent: number) => {
    if (!bookId) return
    const pos = `scroll:${offset}`
    currentPositionRef.current = pos
    await saveProgress({ bookId, position: pos, percent, updatedAt: Date.now() })
  }, [bookId])

  const handlePageProgress = useCallback(async (page: number, percent: number) => {
    if (!bookId) return
    const pos = `page:${page}`
    currentPositionRef.current = pos
    await saveProgress({ bookId, position: pos, percent, updatedAt: Date.now() })
  }, [bookId])

  const handleEpubProgress = useCallback(async (cfi: string, percent: number) => {
    if (!bookId) return
    currentPositionRef.current = cfi
    await saveProgress({ bookId, position: cfi, percent, updatedAt: Date.now() })
  }, [bookId])

  const handleAddBookmark = useCallback(async () => {
    const pos = currentPositionRef.current
    if (!pos) return
    let label = 'Bookmark'
    if (pos.startsWith('page:')) {
      label = `Page ${parseInt(pos.slice(5)) + 1}`
    } else if (pos.startsWith('scroll:')) {
      label = `Position ${pos.slice(7)}`
    } else {
      label = `Location ${pos.slice(0, 20)}`
    }
    await addBookmark(pos, label)
  }, [addBookmark])

  const handleNavigateBookmark = useCallback((position: string) => {
    if (position.startsWith('page:')) {
      const page = parseInt(position.slice(5)) || 0
      setInitialPage(page)
      // Convert page to fraction for positionSync (approximation)
      setReaderKey(k => k + 1)
    } else if (position.startsWith('scroll:')) {
      const offset = Number(position.replace('scroll:', '')) || 0
      setInitialOffset(offset)
      setReaderKey(k => k + 1)
    } else {
      // EPUB CFI
      renditionRef.current?.display(position)
    }
  }, [])

  if (!book) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
      <ReaderToolbar
        title={book.title}
        onTogglePanel={() => setShowPanel(true)}
      />

      <div className="flex-1 overflow-hidden">
        {mode === 'speed' ? (
          <SpeedReaderView text={plainText || stripMarkdown(mdContent)} extracting={extracting} />
        ) : (
          <>
            {(book.format === 'md' || book.format === 'txt') && layout === 'scroll' && (
              <MarkdownReader
                key={readerKey}
                content={mdContent}
                initialOffset={initialOffset}
                onProgressChange={handleScrollProgress}
              />
            )}
            {(book.format === 'md' || book.format === 'txt') && layout === 'pages' && (
              <PaginatedReader
                key={readerKey}
                content={mdContent}
                initialPage={initialPage}
                onProgressChange={handlePageProgress}
                onWordTap={toggleMode}
              />
            )}
            {book.format === 'epub' && epubBuffer && (
              <EpubReader
                epubBuffer={epubBuffer}
                initialCfi={initialCfi}
                onProgressChange={handleEpubProgress}
                onTocReady={setToc}
              />
            )}
          </>
        )}
      </div>

      {showPanel && (
        <ContentPanel
          toc={toc}
          bookmarks={bookmarks}
          onSelectToc={(href) => { renditionRef.current?.display(href) }}
          onNavigateBookmark={handleNavigateBookmark}
          onAddBookmark={handleAddBookmark}
          onDeleteBookmark={removeBookmark}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  )
}
