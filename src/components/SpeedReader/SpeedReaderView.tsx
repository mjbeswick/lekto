import { useEffect, useRef, useState } from 'react'
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

function formatTime(seconds: number): string {
  if (seconds <= 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export default function SpeedReaderView({ text, extracting = false }: Props) {
  const defaultWpm = useAppStore(s => s.defaultWpm)
  const setDefaultWpm = useAppStore(s => s.setDefaultWpm)
  const wordLengthScaling = useAppStore(s => s.wordLengthScaling)
  const rsvpChunkLetters = useAppStore(s => s.rsvpChunkLetters)
  // Capture reading position at mount time — applied when text tokenizes
  const [startFraction] = useState(() => getReadingPosition())
  const { tokens, index, playing, wpm, play, pause, toggle, setWpm, jumpSentence } = useRsvp(text, defaultWpm, wordLengthScaling, rsvpChunkLetters, startFraction)
  const prevWpmRef = useRef(wpm)
  const wpmRef = useRef(wpm)
  wpmRef.current = wpm
  const containerRef = useRef<HTMLDivElement>(null)


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

  // Non-passive wheel for WPM adjust
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      setWpm(wpmRef.current + (e.deltaY > 0 ? -10 : 10))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [setWpm])

  // Keyboard shortcuts: Space=toggle, ←→=sentence, ↑↓=WPM
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); toggle() }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); jumpSentence(-1) }
      else if (e.code === 'ArrowRight') { e.preventDefault(); jumpSentence(1) }
      else if (e.code === 'ArrowUp') { e.preventDefault(); setWpm(wpmRef.current + 25) }
      else if (e.code === 'ArrowDown') { e.preventDefault(); setWpm(wpmRef.current - 25) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle, jumpSentence, setWpm])

  // Pause when window loses focus
  useEffect(() => {
    const handler = () => { if (document.hidden) pause() }
    document.addEventListener('visibilitychange', handler)
    window.addEventListener('blur', handler)
    return () => {
      document.removeEventListener('visibilitychange', handler)
      window.removeEventListener('blur', handler)
    }
  }, [pause])

  const chunkWords = (() => {
    if (tokens.length === 0) return []
    if (rsvpChunkLetters <= 1) return [tokens[index]?.word].filter(Boolean) as string[]
    let chars = 0, count = 0
    while (index + count < tokens.length) {
      const w = tokens[index + count].word
      chars += w.length + (count > 0 ? 1 : 0)
      count++
      if (chars >= rsvpChunkLetters) break
    }
    return tokens.slice(index, index + Math.max(1, count)).map(t => t.word)
  })()
  const progress = tokens.length ? (index + 1) / tokens.length : 0
  const wordsRemaining = Math.max(0, tokens.length - index - 1)
  const timeRemainingS = wpm > 0 ? Math.ceil(wordsRemaining / wpm * 60) : 0

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
      <div className="flex-shrink-0 flex justify-between items-center px-6 pt-3 pb-1 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
        <span>{tokens.length > 0 ? `${(index + 1).toLocaleString()} / ${tokens.length.toLocaleString()}` : '—'}</span>
        <span>{elapsed > 0 ? formatTime(elapsed) : tokens.length > 0 ? `~${formatTime(Math.ceil(tokens.length / wpm * 60))} total` : ''}</span>
        <span>{timeRemainingS > 0 ? `~${formatTime(timeRemainingS)} left` : tokens.length > 0 && index >= tokens.length - 1 ? 'Done ✓' : '—'}</span>
      </div>

      {/* Word display */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
        {extracting ? (
          <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-muted)' }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--reader-accent)', borderTopColor: 'transparent' }} />
            <p className="text-sm">Extracting text…</p>
          </div>
        ) : (
          <>
            <div className="relative w-full max-w-xl mx-auto flex flex-col items-center gap-3">
              {/* Top guide line */}
              <div className="w-full h-px" style={{ backgroundColor: 'var(--reader-accent)', opacity: 0.3 }} />
              <RsvpChunk words={chunkWords.length ? chunkWords : ['···']} fontSize={52} />
              {/* Bottom guide line */}
              <div className="w-full h-px" style={{ backgroundColor: 'var(--reader-accent)', opacity: 0.3 }} />
              
              {/* Center guide ticks */}
              {rsvpChunkLetters <= 1 && (
                <>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3" style={{ backgroundColor: 'var(--reader-accent)', opacity: 0.5 }} />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-3" style={{ backgroundColor: 'var(--reader-accent)', opacity: 0.5 }} />
                </>
              )}
            </div>

            {/* Context row — only in single-word mode */}
            {rsvpChunkLetters <= 1 && (
              <div className="flex gap-4 items-baseline text-lg font-serif" style={{ color: 'var(--reader-fg)', opacity: 0.25 }}>
                <span className="truncate max-w-[30vw] text-right">{tokens[index - 1]?.word ?? ''}</span>
                <span className="text-sm opacity-0">·</span>
                <span className="truncate max-w-[30vw]">{tokens[index + chunkWords.length]?.word ?? ''}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 pb-8 pt-3 flex flex-col items-center gap-5 px-8">
        {/* Controls row */}
        <div className="flex items-center gap-10">
          <button
            onClick={() => jumpSentence(-1)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-opacity active:opacity-50"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--reader-fg)' }}
            aria-label="Previous sentence"
          ><FontAwesomeIcon icon={faBackwardStep} size="lg" /></button>

          <PlayDragButton playing={playing} wpm={wpm} onToggle={toggle} onPlay={play} onPause={pause} onWpmChange={setWpm} />

          <button
            onClick={() => jumpSentence(1)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-opacity active:opacity-50"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--reader-fg)' }}
            aria-label="Next sentence"
          ><FontAwesomeIcon icon={faForwardStep} size="lg" /></button>
        </div>
      </div>

      {/* WPM — bottom right */}
      <div className="absolute bottom-4 right-4 flex items-baseline gap-1 tabular-nums">
        <span
          className="text-sm font-semibold font-mono transition-colors duration-200"
          style={{ color: playing ? 'var(--reader-accent)' : 'var(--text-muted)' }}
        >
          {wpm}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>WPM</span>
      </div>

      {/* Help icon — bottom left */}
      <div className={`absolute bottom-4 left-4 transition-opacity duration-200 ${playing ? 'invisible' : ''}`}>
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
            Space · ←→ sentence · ↑↓ speed · scroll
          </div>
        </div>
      </div>
    </div>
  )
}
