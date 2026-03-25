import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { saveProgress } from '../db/progress'
import PaginatedReader from '../components/Reader/PaginatedReader'
import ScrollReader from '../components/Reader/ScrollReader'
import ContentPanel from '../components/Reader/ContentPanel'
import ReaderToolbar from '../components/Reader/ReaderToolbar'
import SpeedReaderView from '../components/SpeedReader/SpeedReaderView'
import TtsReaderView from '../components/TtsReader/TtsReaderView'
import { useBookmarks } from '../hooks/useBookmarks'
import { useReaderModeStore } from '../hooks/useReaderMode'
import { useAppStore } from '../store/appStore'
import { useBookContent } from '../hooks/useBookContent'
import { setReadingPosition } from '../utils/positionSync'

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const READ_THRESHOLD_MS = 30_000

  const { mode, layout, toggleMode } = useReaderModeStore()
  const {
    theme,
    removePageBackground,
    fullscreenHeaderAutohide,
    ttsRate,
    ttsPitch,
    ttsVoiceURI,
    setTtsRate,
    setTtsPitch,
    setTtsVoiceURI,
  } = useAppStore()

  const { book, content, plainText, toc, initialOffset, initialPage, loading } = useBookContent(bookId, layout)

  const [readerKey, setReaderKey] = useState(0)
  const [currentOffset, setCurrentOffset] = useState(initialOffset)
  const [currentPageNum, setCurrentPageNum] = useState(initialPage)
  const [showPanel, setShowPanel] = useState(false)
  const [currentTocId, setCurrentTocId] = useState<string | undefined>()
  const [headerVisible, setHeaderVisible] = useState(true)

  const currentPositionRef = useRef<string>('')
  const currentPercentRef = useRef(0)
  const scrollMaxHeightRef = useRef(0)
  const initialPositionRef = useRef<string | null>(null)
  const hasMarkedReadRef = useRef(false)
  const readTimerRef = useRef<number | null>(null)
  const headerHideTimerRef = useRef<number | null>(null)

  const { bookmarks, load: loadBookmarks, addBookmark, removeBookmark } = useBookmarks(bookId ?? '')

  const readerCanvasBg = theme === 'light' && !removePageBackground ? '#d8d8d8' : 'var(--reader-canvas-bg)'
  const headerOffset = 'calc(4rem + var(--safe-top))'

  const clearReadTimer = useCallback(() => {
    if (readTimerRef.current !== null) {
      window.clearTimeout(readTimerRef.current)
      readTimerRef.current = null
    }
  }, [])

  const clearHeaderHideTimer = useCallback(() => {
    if (headerHideTimerRef.current !== null) {
      window.clearTimeout(headerHideTimerRef.current)
      headerHideTimerRef.current = null
    }
  }, [])

  const showHeaderImmediately = useCallback(() => {
    window.requestAnimationFrame(() => {
      setHeaderVisible(true)
    })
  }, [])

  const scheduleHeaderHide = useCallback(() => {
    clearHeaderHideTimer()
    if (!fullscreenHeaderAutohide || showPanel) return
    headerHideTimerRef.current = window.setTimeout(() => {
      setHeaderVisible(false)
    }, 2200)
  }, [clearHeaderHideTimer, fullscreenHeaderAutohide, showPanel])

  const showHeader = useCallback(() => {
    setHeaderVisible(true)
    scheduleHeaderHide()
  }, [scheduleHeaderHide])

  const markBookAsRead = useCallback(async () => {
    if (!bookId || hasMarkedReadRef.current) return
    hasMarkedReadRef.current = true
    clearReadTimer()
    // updateLastOpened is already called by useBookContent on load
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

  // Reset per-book state and start read timer
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

    void loadBookmarks()

    return () => { clearReadTimer() }
  }, [bookId, clearReadTimer, loadBookmarks, markBookAsRead])

  // Sync reader key when initial position changes (e.g. navigating bookmarks)
  useEffect(() => {
    setCurrentOffset(initialOffset)
  }, [initialOffset])

  useEffect(() => {
    setCurrentPageNum(initialPage)
  }, [initialPage])

  // Header autohide
  useEffect(() => {
    if (!fullscreenHeaderAutohide || showPanel) {
      clearHeaderHideTimer()
      showHeaderImmediately()
      return
    }
    showHeaderImmediately()
    scheduleHeaderHide()
    return clearHeaderHideTimer
  }, [bookId, clearHeaderHideTimer, fullscreenHeaderAutohide, scheduleHeaderHide, showHeaderImmediately, showPanel])

  useEffect(() => clearHeaderHideTimer, [clearHeaderHideTimer])

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

  const handleAddBookmark = useCallback(async () => {
    const pos = currentPositionRef.current
    if (!pos) return
    const pct = Math.round(currentPercentRef.current * 100)
    let label: string
    if (pos.startsWith('page:')) {
      label = `Page ${parseInt(pos.slice(5)) + 1}`
    } else {
      label = pct > 0 ? `~${pct}% through` : 'Bookmark'
    }
    await addBookmark(pos, label)
  }, [addBookmark])

  const handleSearchResultSelect = useCallback((offset: number) => {
    if (!plainText.length) return
    const fraction = offset / plainText.length
    if (layout === 'scroll' && scrollMaxHeightRef.current > 0) {
      setCurrentOffset(Math.round(fraction * scrollMaxHeightRef.current))
      setReaderKey(k => k + 1)
    }
  }, [plainText, layout])

  const handleNavigateBookmark = useCallback((position: string) => {
    if (position.startsWith('page:')) {
      const page = parseInt(position.slice(5)) || 0
      setCurrentPageNum(page)
      setReaderKey(k => k + 1)
    } else if (position.startsWith('scroll:')) {
      const offset = Number(position.replace('scroll:', '')) || 0
      setCurrentOffset(offset)
      setReaderKey(k => k + 1)
    }
  }, [])

  if (loading || !book) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]" style={{ backgroundColor: readerCanvasBg, color: 'var(--reader-fg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden" style={{ backgroundColor: readerCanvasBg, color: 'var(--reader-fg)' }}>
      {fullscreenHeaderAutohide && !headerVisible && (
        <button
          type="button"
          className="absolute inset-x-0 top-0 z-30 h-12 cursor-default bg-transparent"
          aria-label="Show reader header"
          onClick={showHeader}
          onTouchStart={showHeader}
          onMouseEnter={showHeader}
        />
      )}

      <div
        className={`absolute inset-x-0 top-0 z-40 transition-transform duration-200 ${headerVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'}`}
        onMouseEnter={showHeader}
        onMouseLeave={scheduleHeaderHide}
      >
        <ReaderToolbar
          title={book.title}
          onTogglePanel={() => setShowPanel(true)}
        />
      </div>

      <div
        className="flex-1 min-h-0 overflow-hidden transition-[padding-top] duration-200"
        style={{ paddingTop: fullscreenHeaderAutohide ? 0 : headerOffset, backgroundColor: removePageBackground ? undefined : 'var(--reader-page-bg)' }}
      >
        {mode === 'speed' ? (
          <SpeedReaderView text={plainText} extracting={false} />
        ) : mode === 'tts' ? (
          <TtsReaderView
            text={plainText}
            extracting={false}
            rate={ttsRate}
            pitch={ttsPitch}
            voiceUri={ttsVoiceURI}
            onRateChange={setTtsRate}
            onPitchChange={setTtsPitch}
            onVoiceChange={(voiceUri) => setTtsVoiceURI(voiceUri ?? '')}
            onProgress={(progress) => setReadingPosition(progress.fraction)}
          />
        ) : content ? (
          layout === 'scroll' ? (
            <ScrollReader
              key={readerKey}
              content={content}
              initialOffset={currentOffset}
              onProgressChange={handleScrollProgress}
            />
          ) : (
            <PaginatedReader
              key={readerKey}
              content={content}
              initialPage={currentPageNum}
              onProgressChange={handlePageProgress}
              onWordTap={toggleMode}
            />
          )
        ) : null}
      </div>

      <ContentPanel
        open={showPanel}
        toc={toc}
        bookmarks={bookmarks}
        searchText={plainText || undefined}
        currentHref={currentTocId}
        onSelectToc={(id) => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
        }}
        onNavigateBookmark={handleNavigateBookmark}
        onAddBookmark={handleAddBookmark}
        onDeleteBookmark={removeBookmark}
        onSearchResultSelect={handleSearchResultSelect}
        onClose={() => setShowPanel(false)}
      />
    </div>
  )
}
