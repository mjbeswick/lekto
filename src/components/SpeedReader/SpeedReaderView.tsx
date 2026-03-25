import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBackwardStep, faForwardStep } from '@fortawesome/free-solid-svg-icons'
import { useAppStore } from '../../store/appStore'
import { useRsvp } from '../../hooks/useRsvp'
import RsvpChunk from './RsvpChunk'
import PlayDragButton from './PlayDragButton'
import { getReadingPosition, setReadingPosition } from '../../utils/positionSync'


interface Props {
  text: string
  extracting?: boolean
}

const RSVP_FONT = 'Inter, system-ui, -apple-system, sans-serif'
const SMALL_SCREEN_QUERY = '(max-width: 640px)'
const MIN_RSVP_FONT_SIZE = 32
const MAX_RSVP_FONT_SIZE = 80
const RSVP_FONT_SIZE_STEP = 2
const TOUCH_DRAG_THRESHOLD = 12
const TOUCH_WPM_SENSITIVITY = 4
const TOUCH_FONT_SENSITIVITY = 18

function sameOffsets(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) < 0.5)
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}


export default function SpeedReaderView({ text, extracting = false }: Props) {
  const defaultWpm = useAppStore(s => s.defaultWpm)
  const setDefaultWpm = useAppStore(s => s.setDefaultWpm)
  const wordLengthScaling = useAppStore(s => s.wordLengthScaling)
  const rsvpChunkLetters = useAppStore(s => s.rsvpChunkLetters)
  const rsvpShowContext = useAppStore(s => s.rsvpShowContext)
  const rsvpFontSize = useAppStore(s => s.rsvpFontSize)
  const setRsvpFontSize = useAppStore(s => s.setRsvpFontSize)
  const [isSmallScreen, setIsSmallScreen] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(SMALL_SCREEN_QUERY).matches
  })
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window === 'undefined') return 390
    return window.innerWidth
  })
  const [effectiveChunkLetters, setEffectiveChunkLetters] = useState(rsvpChunkLetters)
  // Capture reading position at mount time — applied when text tokenizes
  const [startFraction] = useState(() => getReadingPosition())
  const { tokens, index, playing, wpm, play, pause, toggle, setWpm, stepWord, jumpSentence } = useRsvp(text, defaultWpm, wordLengthScaling, effectiveChunkLetters, startFraction)
  const prevWpmRef = useRef(wpm)
  const wpmRef = useRef(wpm)
  wpmRef.current = wpm
  const fontSizeRef = useRef(rsvpFontSize)
  fontSizeRef.current = rsvpFontSize
  const touchDragRef = useRef<{
    startX: number
    startY: number
    startWpm: number
    startFontSize: number
    mode: 'wpm' | 'font' | null
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const guideFrameRef = useRef<HTMLDivElement>(null)
  const chunkRef = useRef<HTMLDivElement>(null)
  const [orpGuideOffsets, setOrpGuideOffsets] = useState<number[]>([])
  const showContext = rsvpShowContext && viewportWidth >= 700
  const stageWidth = Math.max(220, Math.min(viewportWidth - (isSmallScreen ? 24 : 96), isSmallScreen ? 360 : 720))
  const laneWidth = Math.min(stageWidth, isSmallScreen ? 320 : 440)
  const smallScreenFontCap = Math.max(34, Math.min(52, viewportWidth * 0.145))
  const displayFontSize = isSmallScreen ? Math.min(rsvpFontSize, smallScreenFontCap) : rsvpFontSize
  const contextFontSize = Math.max(18, Math.round(displayFontSize * (isSmallScreen ? 0.48 : 0.54)))


  // Keep shared position in sync so returning to ebook lands on the right page
  const tokensLenRef = useRef(0)
  tokensLenRef.current = tokens.length
  const indexSyncRef = useRef(0)
  indexSyncRef.current = index
  useEffect(() => {
    if (tokens.length > 1) setReadingPosition(index / (tokens.length - 1))
  }, [index, tokens.length])
  useEffect(() => () => {
    if (tokensLenRef.current > 1) setReadingPosition(indexSyncRef.current / (tokensLenRef.current - 1))
  }, [])

  // Elapsed timer
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef(0)
  const timerStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (playing) {
      timerStartRef.current = Date.now() - elapsedRef.current * 1000
      const id = setInterval(() => {
        const secs = Math.floor((Date.now() - timerStartRef.current!) / 1000)
        elapsedRef.current = secs
        setElapsed(secs)
      }, 1000)
      return () => clearInterval(id)
    }
  }, [playing])

  // Persist WPM changes
  useEffect(() => {
    if (wpm !== prevWpmRef.current) {
      prevWpmRef.current = wpm
      setDefaultWpm(wpm)
    }
  }, [wpm, setDefaultWpm])

  // Non-passive wheel: vertical scroll adjusts WPM, horizontal scroll adjusts reticle size.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()

      const absX = Math.abs(e.deltaX)
      const absY = Math.abs(e.deltaY)

      if (absX > absY && absX > 0) {
        const delta = e.deltaX > 0 ? -RSVP_FONT_SIZE_STEP : RSVP_FONT_SIZE_STEP
        setRsvpFontSize(clamp(fontSizeRef.current + delta, MIN_RSVP_FONT_SIZE, MAX_RSVP_FONT_SIZE))
        return
      }

      if (absY > 0) {
        setWpm(wpmRef.current + (e.deltaY > 0 ? -10 : 10))
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [setRsvpFontSize, setWpm])

  // Keyboard shortcuts: Space=toggle, arrows=step by word
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      if (e.code === 'Space') { e.preventDefault(); toggle() }
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') { e.preventDefault(); stepWord(-1) }
      else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') { e.preventDefault(); stepWord(1) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [stepWord, toggle])

  // Pause when window loses focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) pause()
    }
    const handleBlur = () => pause()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
  }, [pause])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(SMALL_SCREEN_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsSmallScreen(event.matches)
    const handleResize = () => setViewportWidth(window.innerWidth)

    setIsSmallScreen(mediaQuery.matches)
    setViewportWidth(window.innerWidth)
    mediaQuery.addEventListener('change', handleChange)
    window.addEventListener('resize', handleResize)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleReaderTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSmallScreen || e.touches.length !== 1) return

    const touch = e.touches[0]
    touchDragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startWpm: wpmRef.current,
      startFontSize: fontSizeRef.current,
      mode: null,
    }
  }

  const handleReaderTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSmallScreen || e.touches.length !== 1 || !touchDragRef.current) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchDragRef.current.startX
    const deltaY = touchDragRef.current.startY - touch.clientY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (!touchDragRef.current.mode) {
      if (absX < TOUCH_DRAG_THRESHOLD && absY < TOUCH_DRAG_THRESHOLD) return
      touchDragRef.current.mode = absX > absY ? 'font' : 'wpm'
    }

    e.preventDefault()

    if (touchDragRef.current.mode === 'font') {
      const steps = Math.round(deltaX / TOUCH_FONT_SENSITIVITY)
      setRsvpFontSize(clamp(
        touchDragRef.current.startFontSize + steps * RSVP_FONT_SIZE_STEP,
        MIN_RSVP_FONT_SIZE,
        MAX_RSVP_FONT_SIZE
      ))
      return
    }

    const wpmDelta = Math.round(deltaY / TOUCH_WPM_SENSITIVITY)
    setWpm(touchDragRef.current.startWpm + wpmDelta)
  }

  const handleReaderTouchEnd = () => {
    touchDragRef.current = null
  }

  useLayoutEffect(() => {
    setEffectiveChunkLetters(rsvpChunkLetters)
  }, [index, isSmallScreen, rsvpChunkLetters])

  const chunkWords = (() => {
    if (tokens.length === 0) return []
    if (effectiveChunkLetters <= 1) return [tokens[index]?.word].filter(Boolean) as string[]
    let chars = 0, count = 0
    while (index + count < tokens.length) {
      const w = tokens[index + count].word
      chars += w.length + (count > 0 ? 1 : 0)
      count++
      if (chars >= effectiveChunkLetters) break
    }
    return tokens.slice(index, index + Math.max(1, count)).map(t => t.word)
  })()
  const chunkGuideKey = chunkWords.join('\u0000')
  const progress = tokens.length ? (index + 1) / tokens.length : 0
  const wordsRemaining = Math.max(0, tokens.length - index - 1)
  const timeRemainingS = wpm > 0 ? Math.ceil(wordsRemaining / wpm * 60) : 0
  const sentenceContext = (() => {
    if (!showContext || tokens.length === 0) return null
    let start = index
    while (start > 0 && !tokens[start - 1].isSentenceEnd) start--
    let end = index + chunkWords.length - 1
    while (end < tokens.length - 1 && !tokens[end].isSentenceEnd) end++
    const words = tokens.slice(start, end + 1).map(t => t.word)
    return { words, currentStart: index - start, currentEnd: index + chunkWords.length - start }
  })()

  useLayoutEffect(() => {
    if (!isSmallScreen || effectiveChunkLetters <= 1) return

    const chunk = chunkRef.current
    if (!chunk || chunk.clientWidth <= 0) return

    const isOverflowing = chunk.scrollWidth > chunk.clientWidth + 1
    if (isOverflowing) {
      setEffectiveChunkLetters(prev => Math.max(1, prev - 1))
    }
  }, [chunkGuideKey, displayFontSize, effectiveChunkLetters, isSmallScreen, showContext])

  useEffect(() => {
    const frame = guideFrameRef.current
    const chunk = chunkRef.current
    if (!frame || !chunk) return

    const updateGuides = () => {
      const frameRect = frame.getBoundingClientRect()
      const nextOffsets = Array.from(chunk.querySelectorAll<HTMLElement>('[data-orp-char]'))
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return rect.left + rect.width / 2 - frameRect.left
        })
        .filter((offset) => Number.isFinite(offset))

      setOrpGuideOffsets((prev) => sameOffsets(prev, nextOffsets) ? prev : nextOffsets)
    }

    const frameId = requestAnimationFrame(updateGuides)
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => updateGuides())

    resizeObserver?.observe(frame)
    resizeObserver?.observe(chunk)
    chunk.querySelectorAll('[data-orp-char]').forEach((element) => resizeObserver?.observe(element))
    window.addEventListener('resize', updateGuides)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateGuides)
      resizeObserver?.disconnect()
    }
  }, [chunkGuideKey, displayFontSize, laneWidth])

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-full select-none"
      style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}
    >
      {/* Progress bar */}
      <div className="h-1 flex-shrink-0" style={{ backgroundColor: 'var(--surface-2)' }}>
        <div className="h-1 transition-[width] duration-100" style={{ width: `${progress * 100}%`, backgroundColor: 'var(--reader-accent)' }} />
      </div>

      {/* Stats strip */}
      <div className="flex-shrink-0 flex flex-wrap justify-between items-center gap-x-3 gap-y-1 px-4 pt-3 pb-1 text-xs tabular-nums sm:px-6" style={{ color: 'var(--text-muted)' }}>
        <span>{tokens.length > 0 ? `${(index + 1).toLocaleString()} / ${tokens.length.toLocaleString()}` : '—'}</span>
        <span>{elapsed > 0 ? formatTime(elapsed) : tokens.length > 0 ? `~${formatTime(Math.ceil(tokens.length / wpm * 60))} total` : ''}</span>
        <span>{timeRemainingS > 0 ? `~${formatTime(timeRemainingS)} left` : tokens.length > 0 && index >= tokens.length - 1 ? 'Done ✓' : '—'}</span>
      </div>

      {/* Word display */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-4 gap-5 sm:gap-6 sm:px-8"
        onTouchStart={handleReaderTouchStart}
        onTouchMove={handleReaderTouchMove}
        onTouchEnd={handleReaderTouchEnd}
        onTouchCancel={handleReaderTouchEnd}
        style={{ touchAction: isSmallScreen ? 'none' : 'auto' }}
      >
        {extracting ? (
          <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-muted)' }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--reader-accent)', borderTopColor: 'transparent' }} />
            <p className="text-sm">Extracting text…</p>
          </div>
        ) : (
          <>
            <div ref={guideFrameRef} className="relative mx-auto w-full" style={{ height: isSmallScreen ? '96px' : '120px', maxWidth: `${stageWidth}px` }}>
              {/* Top guide line */}
              <div className="absolute top-3 w-full h-px" style={{ backgroundColor: 'var(--reader-accent)', opacity: 0.3 }} />

              {/* Top vertical guides - aligned with ORP characters */}
              {orpGuideOffsets.map((offset, offsetIndex) => (
                <div
                  key={`top-${offsetIndex}-${offset}`}
                  className="absolute"
                  style={{ left: `${offset}px`, transform: 'translateX(-50%)', top: '0.75rem', height: '0.85rem', width: '1px', backgroundColor: 'var(--reader-accent)', opacity: 0.8 }}
                />
              ))}

              {/* Text container - centered vertically */}
              <div data-text-container className="absolute inset-0 flex items-center justify-center" style={{ top: isSmallScreen ? '1.5rem' : '1.75rem', bottom: isSmallScreen ? '1.5rem' : '1.75rem' }}>
                <div ref={chunkRef} data-current-chunk style={{ maxWidth: `${laneWidth}px`, width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <RsvpChunk words={chunkWords.length ? chunkWords : ['···']} fontSize={displayFontSize} />
                </div>
              </div>

              {/* Bottom vertical guides - aligned with ORP characters */}
              {orpGuideOffsets.map((offset, offsetIndex) => (
                <div
                  key={`bottom-${offsetIndex}-${offset}`}
                  className="absolute"
                  style={{ left: `${offset}px`, transform: 'translateX(-50%)', bottom: '0.75rem', height: '0.85rem', width: '1px', backgroundColor: 'var(--reader-accent)', opacity: 0.8 }}
                />
              ))}

              {/* Bottom guide line */}
              <div className="absolute bottom-3 w-full h-px" style={{ backgroundColor: 'var(--reader-accent)', opacity: 0.3 }} />
            </div>

            {/* Sentence context strip */}
            {sentenceContext && (
              <div style={{ maxWidth: `${stageWidth}px`, width: '100%', textAlign: 'center', fontSize: `${contextFontSize}px`, fontFamily: RSVP_FONT, fontWeight: 500, lineHeight: 1.6, color: 'var(--reader-fg)', padding: '0 0.5rem' }}>
                {sentenceContext.words.map((word, i) => {
                  const isCurrent = i >= sentenceContext.currentStart && i < sentenceContext.currentEnd
                  return (
                    <span key={i} style={{ opacity: isCurrent ? 1 : 0.28, fontWeight: isCurrent ? 600 : 500 }}>
                      {word}{i < sentenceContext.words.length - 1 ? ' ' : ''}
                    </span>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 pb-6 pt-3 flex flex-col items-center gap-4 px-4 sm:gap-5 sm:px-8" style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}>
        {/* Controls row */}
        <div className="flex items-center gap-5 sm:gap-10">
          <button
            onClick={() => jumpSentence(-1)}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-opacity active:opacity-50"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--reader-fg)' }}
            aria-label="Previous sentence"
          ><FontAwesomeIcon icon={faBackwardStep} size="lg" /></button>

          <PlayDragButton playing={playing} wpm={wpm} onToggle={toggle} onPlay={play} onPause={pause} onWpmChange={setWpm} />

          <button
            onClick={() => jumpSentence(1)}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-opacity active:opacity-50"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--reader-fg)' }}
            aria-label="Next sentence"
          ><FontAwesomeIcon icon={faForwardStep} size="lg" /></button>
        </div>
      </div>

      {/* WPM — bottom right */}
      <div className="absolute flex items-baseline gap-1 tabular-nums" style={{ right: 'max(1rem, var(--safe-right))', bottom: 'calc(0.75rem + var(--safe-bottom))' }}>
        <span
          className="text-sm font-semibold font-mono transition-colors duration-200"
          style={{ color: playing ? 'var(--reader-accent)' : 'var(--text-muted)' }}
        >
          {wpm}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>WPM</span>
      </div>

      {/* Help icon — bottom left */}
      <div className={`absolute transition-opacity duration-200 ${playing ? 'invisible' : ''}`} style={{ left: 'max(1rem, var(--safe-left))', bottom: 'calc(0.75rem + var(--safe-bottom))' }}>
        <div className="relative group">
          <button
            className="flex items-center justify-center w-5 h-5 rounded-full text-xs leading-none"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--text-muted)' }}
            aria-label="Keyboard shortcuts"
          >
            ?
          </button>
          <div
            className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 rounded text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            Space · arrows word-by-word · vertical scroll speed · horizontal scroll reticle size
          </div>
        </div>
      </div>
    </div>
  )
}
