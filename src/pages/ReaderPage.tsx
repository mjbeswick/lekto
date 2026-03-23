import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getBook, updateLastOpened } from '../db/books'
import { getProgress, saveProgress } from '../db/progress'
import type { Book } from '../types'
import MarkdownReader from '../components/Reader/MarkdownReader'
import PaginatedReader from '../components/Reader/PaginatedReader'
import EpubReader, { type TocItem } from '../components/Reader/EpubReader'
import TocDrawer from '../components/Reader/TocDrawer'
import BookmarksPanel from '../components/Reader/BookmarksPanel'
import ReaderToolbar from '../components/Reader/ReaderToolbar'
import SpeedReaderView from '../components/SpeedReader/SpeedReaderView'
import { stripMarkdown } from '../utils/textTokenizer'
import { useBookmarks } from '../hooks/useBookmarks'
import { useReaderModeStore } from '../hooks/useReaderMode'
import { readFileContent, readFileBase64 } from '../utils/fileStore'
import { extractEpubText } from '../utils/epubParser'
import { setReadingPosition } from '../utils/positionSync'

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const [book, setBook] = useState<Book | null>(null)
  const [mdContent, setMdContent] = useState('')
  const [epubBase64, setEpubBase64] = useState('')
  const [plainText, setPlainText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [initialOffset, setInitialOffset] = useState(0)
  const [initialPage, setInitialPage] = useState(0)
  const [initialCfi, setInitialCfi] = useState<string | undefined>()
  const [readerKey, setReaderKey] = useState(0)
  const [showToc, setShowToc] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
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
        const base64 = await readFileBase64(b.filePath)
        setEpubBase64(base64)
        if (saved) setInitialCfi(saved.position)
        setExtracting(true)
        extractEpubText(base64)
          .then(text => setPlainText(text))
          .catch(err => console.error('[Lekto] EPUB text extraction failed:', err))
          .finally(() => setExtracting(false))
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

  // Check if current position is already bookmarked
  const isBookmarked = bookmarks.some(b => b.position === currentPositionRef.current)

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
        onToggleToc={book.format === 'epub' && toc.length > 0 ? () => setShowToc(true) : undefined}
        onAddBookmark={handleAddBookmark}
        onToggleBookmarks={() => setShowBookmarks(true)}
        isBookmarked={isBookmarked}
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
            {book.format === 'epub' && epubBase64 && (
              <EpubReader
                base64Data={epubBase64}
                initialCfi={initialCfi}
                onProgressChange={handleEpubProgress}
                onTocReady={setToc}
              />
            )}
          </>
        )}
      </div>

      {showToc && <TocDrawer toc={toc} onSelect={(href) => { renditionRef.current?.display(href); setShowToc(false) }} onClose={() => setShowToc(false)} />}
      {showBookmarks && (
        <BookmarksPanel
          bookmarks={bookmarks}
          onNavigate={handleNavigateBookmark}
          onDelete={removeBookmark}
          onClose={() => setShowBookmarks(false)}
        />
      )}
    </div>
  )
}
