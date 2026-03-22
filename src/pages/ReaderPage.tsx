import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getBook, updateLastOpened } from '../db/books'
import { getProgress, saveProgress } from '../db/progress'
import type { Book } from '../types'
import MarkdownReader from '../components/Reader/MarkdownReader'
import PaginatedReader from '../components/Reader/PaginatedReader'
import EpubReader, { type TocItem } from '../components/Reader/EpubReader'
import TocDrawer from '../components/Reader/TocDrawer'
import AnnotationsPanel from '../components/Reader/AnnotationsPanel'
import ReaderToolbar from '../components/Reader/ReaderToolbar'
import SpeedReaderView from '../components/SpeedReader/SpeedReaderView'
import { stripMarkdown } from '../utils/textTokenizer'
import { useHighlights } from '../hooks/useHighlights'
import { useReaderModeStore } from '../hooks/useReaderMode'
import { readFileContent, readFileBase64 } from '../utils/fileStore'
import { extractEpubText } from '../utils/epubParser'

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
  const [showToc, setShowToc] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [toc, setToc] = useState<TocItem[]>([])
  const renditionRef = useRef<any>(null)

  const { mode, layout, toggleMode } = useReaderModeStore()
  const { highlights, notes, load: loadAnnotations, addHighlight, removeHighlight, addNote } = useHighlights(bookId ?? '')

  useEffect(() => {
    if (!bookId) return
    ;(async () => {
      const b = await getBook(bookId)
      if (!b) return
      setBook(b)
      await updateLastOpened(bookId)
      await loadAnnotations()

      const saved = await getProgress(bookId)

      if (b.format === 'epub') {
        const base64 = await readFileBase64(b.filePath)
        setEpubBase64(base64)
        if (saved) setInitialCfi(saved.position)
        // Extract plain text for speed reader in background
        setExtracting(true)
        extractEpubText(base64)
          .then(text => setPlainText(text))
          .catch(err => console.error('[Lekto] EPUB text extraction failed:', err))
          .finally(() => setExtracting(false))
      } else {
        // md and txt both render as plain/markdown text
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
    await saveProgress({ bookId, position: `scroll:${offset}`, percent, updatedAt: Date.now() })
  }, [bookId])

  const handlePageProgress = useCallback(async (page: number, percent: number) => {
    if (!bookId) return
    await saveProgress({ bookId, position: `page:${page}`, percent, updatedAt: Date.now() })
  }, [bookId])

  const handleEpubProgress = useCallback(async (cfi: string, percent: number) => {
    if (!bookId) return
    await saveProgress({ bookId, position: cfi, percent, updatedAt: Date.now() })
  }, [bookId])

  const handleHighlight = async (start: number, end: number, text: string, color: string) => {
    await addHighlight(String(start), String(end), text, color)
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
      <ReaderToolbar
        title={book.title}
        onToggleToc={book.format === 'epub' && toc.length > 0 ? () => setShowToc(true) : undefined}
        onToggleAnnotations={() => setShowAnnotations(true)}
      />

      <div className="flex-1 overflow-hidden">
        {mode === 'speed' ? (
          <SpeedReaderView text={plainText || stripMarkdown(mdContent)} extracting={extracting} />
        ) : (
          <>
            {(book.format === 'md' || book.format === 'txt') && layout === 'scroll' && (
              <MarkdownReader
                content={mdContent}
                initialOffset={initialOffset}
                onProgressChange={handleScrollProgress}
                onHighlight={handleHighlight}
                onNote={text => addNote(text)}
              />
            )}
            {(book.format === 'md' || book.format === 'txt') && layout === 'pages' && (
              <PaginatedReader
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
      {showAnnotations && (
        <AnnotationsPanel
          highlights={highlights}
          notes={notes}
          onDeleteHighlight={removeHighlight}
          onClose={() => setShowAnnotations(false)}
        />
      )}
    </div>
  )
}
