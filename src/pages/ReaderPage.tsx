import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getBook, updateLastOpened } from '../db/books'
import { getProgress, saveProgress } from '../db/progress'
import type { Book } from '../types'
import MarkdownReader from '../components/Reader/MarkdownReader'
import PaginatedReader from '../components/Reader/PaginatedReader'
import EpubReader, { type EpubReaderHandle, type TocItem } from '../components/Reader/EpubReader'
import PdfReader, { type PdfReaderHandle } from '../components/Reader/PdfReader'
import HtmlReader from '../components/Reader/HtmlReader'
import ContentPanel from '../components/Reader/ContentPanel'
import ReaderToolbar from '../components/Reader/ReaderToolbar'
import SpeedReaderView from '../components/SpeedReader/SpeedReaderView'
import { stripMarkdown } from '../utils/textTokenizer'
import { useBookmarks } from '../hooks/useBookmarks'
import { useReaderModeStore } from '../hooks/useReaderMode'
import { useAppStore } from '../store/appStore'
import { readFileContent, readFileAsArrayBuffer } from '../utils/fileStore'
import { extractEpubText } from '../utils/epubParser'
import { extractDocxText, docxToHtml } from '../utils/docxParser'
import { extractFb2Text, fb2ToHtml } from '../utils/fb2Parser'

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const READ_THRESHOLD_MS = 30_000
  const [book, setBook] = useState<Book | null>(null)
  const [mdContent, setMdContent] = useState('')
  const [epubBuffer, setEpubBuffer] = useState<ArrayBuffer | null>(null)
  const [docBuffer, setDocBuffer] = useState<ArrayBuffer | null>(null)
  const [htmlContent, setHtmlContent] = useState('')
  const epubExtractedRef = useRef(false)
  const docExtractedRef = useRef(false)
  const [plainText, setPlainText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [initialOffset, setInitialOffset] = useState(0)
  const [initialPage, setInitialPage] = useState(0)
  const [initialCfi, setInitialCfi] = useState<string | undefined>()
  const [readerKey, setReaderKey] = useState(0)
  const [showPanel, setShowPanel] = useState(false)
  const [toc, setToc] = useState<TocItem[]>([])
  const [currentTocHref, setCurrentTocHref] = useState<string | undefined>()
  const renditionRef = useRef<EpubReaderHandle | null>(null)
  const pdfRef = useRef<PdfReaderHandle | null>(null)
  const currentPositionRef = useRef<string>('')
  const currentPercentRef = useRef(0)
  const scrollMaxHeightRef = useRef(0)
  const initialPositionRef = useRef<string | null>(null)
  const hasMarkedReadRef = useRef(false)
  const readTimerRef = useRef<number | null>(null)

  const { mode, layout, toggleMode } = useReaderModeStore()
  const { theme, removePageBackground } = useAppStore()
  const { bookmarks, load: loadBookmarks, addBookmark, removeBookmark } = useBookmarks(bookId ?? '')
  const readerCanvasBg = theme === 'light' && !removePageBackground ? '#d8d8d8' : 'var(--reader-canvas-bg)'

  const clearReadTimer = useCallback(() => {
    if (readTimerRef.current !== null) {
      window.clearTimeout(readTimerRef.current)
      readTimerRef.current = null
    }
  }, [])

  const markBookAsRead = useCallback(async () => {
    if (!bookId || hasMarkedReadRef.current) return
    hasMarkedReadRef.current = true
    clearReadTimer()
    await updateLastOpened(bookId)
  }, [bookId, clearReadTimer])

  const markBookAsReadFromProgress = useCallback(async (position: string) => {
    if (hasMarkedReadRef.current) return
    const initialPosition = initialPositionRef.current
    if (initialPosition === null) {
      initialPositionRef.current = position
      return
    }
    if (position === initialPosition) return
    await markBookAsRead()
  }, [markBookAsRead])

  useEffect(() => {
    if (!bookId) return
    hasMarkedReadRef.current = false
    initialPositionRef.current = null
    currentPositionRef.current = ''
    currentPercentRef.current = 0
    scrollMaxHeightRef.current = 0
    clearReadTimer()
    readTimerRef.current = window.setTimeout(() => {
      void markBookAsRead()
    }, READ_THRESHOLD_MS)

    ;(async () => {
      const b = await getBook(bookId)
      if (!b) return
      setBook(b)
      await loadBookmarks()

      const saved = await getProgress(bookId)

      if (b.format === 'epub') {
        const buffer = await readFileAsArrayBuffer(b.filePath)
        setEpubBuffer(buffer)
        if (saved) {
          setInitialCfi(saved.position)
          initialPositionRef.current = saved.position
          currentPositionRef.current = saved.position
          currentPercentRef.current = saved.percent
        }
      } else if (b.format === 'pdf') {
        const buffer = await readFileAsArrayBuffer(b.filePath)
        setDocBuffer(buffer)
        if (saved?.position.startsWith('pdf:')) {
          setInitialPage(parseInt(saved.position.slice(4)) || 1)
          initialPositionRef.current = saved.position
          currentPositionRef.current = saved.position
          currentPercentRef.current = saved.percent
        } else {
          initialPositionRef.current = 'pdf:1'
          currentPositionRef.current = 'pdf:1'
        }
      } else if (b.format === 'docx' || b.format === 'fb2') {
        const buffer = await readFileAsArrayBuffer(b.filePath)
        setDocBuffer(buffer)
        const toHtml = b.format === 'docx' ? docxToHtml : fb2ToHtml
        const html = await toHtml(buffer).catch(() => '')
        setHtmlContent(html)
        if (saved) {
          if (saved.position.startsWith('page:')) {
            setInitialPage(parseInt(saved.position.slice(5)) || 0)
          } else {
            setInitialOffset(Number(saved.position.replace('scroll:', '')) || 0)
          }
          initialPositionRef.current = saved.position
          currentPositionRef.current = saved.position
          currentPercentRef.current = saved.percent
        } else if (layout === 'pages') {
          initialPositionRef.current = 'page:0'
          currentPositionRef.current = 'page:0'
        } else {
          initialPositionRef.current = 'scroll:0'
          currentPositionRef.current = 'scroll:0'
        }
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
          initialPositionRef.current = saved.position
          currentPositionRef.current = saved.position
          currentPercentRef.current = saved.percent
        } else if (layout === 'pages') {
          initialPositionRef.current = 'page:0'
          currentPositionRef.current = 'page:0'
        } else {
          initialPositionRef.current = 'scroll:0'
          currentPositionRef.current = 'scroll:0'
        }
      }
    })()
    return () => {
      clearReadTimer()
    }
  }, [READ_THRESHOLD_MS, bookId, clearReadTimer, layout, loadBookmarks, markBookAsRead])

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

  // Lazy DOCX/FB2 text extraction — only triggered when speed reader is first activated
  useEffect(() => {
    if (mode !== 'speed' || !docBuffer || !book || docExtractedRef.current) return
    if (book.format !== 'docx' && book.format !== 'fb2') return
    docExtractedRef.current = true
    setExtracting(true)
    const extract = book.format === 'docx' ? extractDocxText : extractFb2Text
    extract(docBuffer)
      .then(text => setPlainText(text))
      .catch(err => console.error('[Lekto] text extraction failed:', err))
      .finally(() => setExtracting(false))
  }, [mode, docBuffer, book])

  const handleScrollProgress = useCallback(async (offset: number, percent: number) => {
    if (!bookId) return
    const pos = `scroll:${offset}`
    await markBookAsReadFromProgress(pos)
    currentPositionRef.current = pos
    currentPercentRef.current = percent
    if (percent > 0 && percent < 1) scrollMaxHeightRef.current = Math.round(offset / percent)
    await saveProgress({ bookId, position: pos, percent, updatedAt: Date.now() })
  }, [bookId, markBookAsReadFromProgress])

  const handlePageProgress = useCallback(async (page: number, percent: number) => {
    if (!bookId) return
    const pos = `page:${page}`
    await markBookAsReadFromProgress(pos)
    currentPositionRef.current = pos
    currentPercentRef.current = percent
    await saveProgress({ bookId, position: pos, percent, updatedAt: Date.now() })
  }, [bookId, markBookAsReadFromProgress])

  const handleEpubProgress = useCallback(async (cfi: string, percent: number) => {
    if (!bookId) return
    await markBookAsReadFromProgress(cfi)
    currentPositionRef.current = cfi
    currentPercentRef.current = percent
    await saveProgress({ bookId, position: cfi, percent, updatedAt: Date.now() })
  }, [bookId, markBookAsReadFromProgress])

  const handlePdfProgress = useCallback(async (position: string, percent: number) => {
    if (!bookId) return
    await markBookAsReadFromProgress(position)
    currentPositionRef.current = position
    currentPercentRef.current = percent
    await saveProgress({ bookId, position, percent, updatedAt: Date.now() })
  }, [bookId, markBookAsReadFromProgress])

  const handleAddBookmark = useCallback(async () => {
    const pos = currentPositionRef.current
    if (!pos) return
    const pct = Math.round(currentPercentRef.current * 100)
    let label: string
    if (pos.startsWith('page:')) {
      label = `Page ${parseInt(pos.slice(5)) + 1}`
    } else if (pos.startsWith('pdf:')) {
      label = `Page ${pos.slice(4)}`
    } else {
      label = pct > 0 ? `~${pct}% through` : 'Bookmark'
    }
    await addBookmark(pos, label)
  }, [addBookmark])

  const handleSearchResultSelect = useCallback((offset: number) => {
    if (!plainText.length || !book) return
    const fraction = offset / plainText.length
    const isScrollFormat = (book.format === 'md' || book.format === 'txt' || book.format === 'docx' || book.format === 'fb2') && layout === 'scroll'
    if (isScrollFormat && scrollMaxHeightRef.current > 0) {
      setInitialOffset(Math.round(fraction * scrollMaxHeightRef.current))
      setReaderKey(k => k + 1)
    }
  }, [plainText, book, layout])

  const handleNavigateBookmark = useCallback((position: string) => {
    if (position.startsWith('page:')) {
      const page = parseInt(position.slice(5)) || 0
      setInitialPage(page)
      setReaderKey(k => k + 1)
    } else if (position.startsWith('scroll:')) {
      const offset = Number(position.replace('scroll:', '')) || 0
      setInitialOffset(offset)
      setReaderKey(k => k + 1)
    } else if (position.startsWith('pdf:')) {
      const page = parseInt(position.slice(4)) || 1
      pdfRef.current?.goToPage(page)
    } else {
      // EPUB CFI
      renditionRef.current?.display(position)
    }
  }, [])

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]" style={{ backgroundColor: readerCanvasBg, color: 'var(--reader-fg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    )
  }

  const isHtmlFormat = book.format === 'docx' || book.format === 'fb2'

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden" style={{ backgroundColor: readerCanvasBg, color: 'var(--reader-fg)' }}>
      <ReaderToolbar
        title={book.title}
        onTogglePanel={() => setShowPanel(true)}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
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
                ref={renditionRef}
                epubBuffer={epubBuffer}
                initialCfi={initialCfi}
                onProgressChange={handleEpubProgress}
                onTocReady={setToc}
                onLocationChange={setCurrentTocHref}
                layout={layout}
              />
            )}
            {book.format === 'pdf' && docBuffer && (
              <PdfReader
                ref={pdfRef}
                pdfBuffer={docBuffer}
                initialPage={initialPage || 1}
                layout={layout}
                onProgressChange={handlePdfProgress}
                onTocReady={setToc}
              />
            )}
            {isHtmlFormat && htmlContent && layout === 'scroll' && (
              <HtmlReader
                key={readerKey}
                html={htmlContent}
                initialOffset={initialOffset}
                onProgressChange={handleScrollProgress}
              />
            )}
            {isHtmlFormat && htmlContent && layout === 'pages' && (
              <PaginatedReader
                key={readerKey}
                content={plainText}
                initialPage={initialPage}
                onProgressChange={handlePageProgress}
                onWordTap={toggleMode}
              />
            )}
          </>
        )}
      </div>

      <ContentPanel
        open={showPanel}
        toc={toc}
        bookmarks={bookmarks}
        searchText={plainText || undefined}
        currentHref={currentTocHref}
        onSelectToc={(href) => { renditionRef.current?.display(href) }}
        onNavigateBookmark={handleNavigateBookmark}
        onAddBookmark={handleAddBookmark}
        onDeleteBookmark={removeBookmark}
        onSearchResultSelect={handleSearchResultSelect}
        onClose={() => setShowPanel(false)}
      />
    </div>
  )
}
