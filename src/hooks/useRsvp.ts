import { useState, useEffect, useRef, useCallback } from 'react'
import { tokenize, type Token } from '../utils/textTokenizer'

export interface RsvpControls {
  tokens: Token[]
  index: number
  playing: boolean
  wpm: number
  play: () => void
  pause: () => void
  toggle: () => void
  setWpm: (wpm: number) => void
  jumpSentence: (direction: 1 | -1) => void
  reset: () => void
}

/** How many words to show, greedy: keep adding until total chars ≥ minLetters */
function resolveChunk(toks: ReturnType<typeof tokenize>, startIdx: number, minLetters: number): number {
  if (minLetters <= 1) return 1
  let chars = 0
  let count = 0
  while (startIdx + count < toks.length) {
    const word = toks[startIdx + count].word
    chars += word.length + (count > 0 ? 1 : 0) // +1 for inter-word space
    count++
    if (chars >= minLetters) break
  }
  return Math.max(1, count)
}

export function useRsvp(text: string, initialWpm: number, wordLengthScaling = true, chunkLetters = 1, startFraction = 0): RsvpControls {
  const [tokens, setTokens] = useState<Token[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [wpm, setWpmState] = useState(initialWpm)

  // Use refs for timer loop to always read latest state
  const playingRef = useRef(false)
  const wpmRef = useRef(initialWpm)
  const indexRef = useRef(0)
  const tokensRef = useRef<Token[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Capture startFraction at hook-call time so text-change effect always uses the latest value
  const startFractionRef = useRef(startFraction)
  startFractionRef.current = startFraction

  useEffect(() => {
    const t = tokenize(text)
    const si = t.length > 1 ? Math.min(Math.floor(startFractionRef.current * (t.length - 1)), t.length - 1) : 0
    setTokens(t)
    tokensRef.current = t
    setIndex(si)
    indexRef.current = si
    setPlaying(false)
    playingRef.current = false
    clearTimer()
  }, [text])

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])

  const wordLengthScalingRef = useRef(wordLengthScaling)
  wordLengthScalingRef.current = wordLengthScaling
  const chunkLettersRef = useRef(chunkLetters)
  chunkLettersRef.current = chunkLetters

  const scheduleNext = useCallback(() => {
    clearTimer()
    const idx = indexRef.current
    const toks = tokensRef.current
    if (!playingRef.current || idx >= toks.length - 1) {
      if (idx >= toks.length - 1) {
        playingRef.current = false
        setPlaying(false)
      }
      return
    }
    const cs = resolveChunk(toks, idx, chunkLettersRef.current)
    const chunkTokens = toks.slice(idx, idx + cs)
    const maxLen = Math.max(...chunkTokens.map(t => t.word.length))
    const lastToken = chunkTokens[chunkTokens.length - 1]
    const lengthFactor = wordLengthScalingRef.current
      ? Math.max(0.6, Math.min(2.0, maxLen / 5))
      : 1
    const pauseFactor = lastToken?.isSentenceEnd ? 2.5
      : lastToken?.isClauseEnd ? 1.5
      : 1
    const delay = (60000 / wpmRef.current) * cs * lengthFactor * pauseFactor
    timerRef.current = setTimeout(() => {
      const next = Math.min(indexRef.current + cs, toks.length - 1)
      indexRef.current = next
      setIndex(next)
      scheduleNext()
    }, delay)
  }, [clearTimer])

  const play = useCallback(() => {
    if (playingRef.current) return
    playingRef.current = true
    setPlaying(true)
    scheduleNext()
  }, [scheduleNext])

  const pause = useCallback(() => {
    playingRef.current = false
    setPlaying(false)
    clearTimer()
  }, [clearTimer])

  const toggle = useCallback(() => {
    if (playingRef.current) pause()
    else play()
  }, [play, pause])

  const setWpm = useCallback((w: number) => {
    const clamped = Math.max(60, Math.min(1200, w))
    wpmRef.current = clamped
    setWpmState(clamped)
  }, [])

  const jumpSentence = useCallback((direction: 1 | -1) => {
    pause()
    setIndex(prev => {
      const toks = tokensRef.current
      let idx = prev
      if (direction === -1) {
        idx = Math.max(0, idx - 1)
        while (idx > 0 && !toks[idx - 1]?.isSentenceEnd) idx--
      } else {
        while (idx < toks.length - 1 && !toks[idx]?.isSentenceEnd) idx++
        idx = Math.min(toks.length - 1, idx + 1)
      }
      indexRef.current = idx
      return idx
    })
  }, [pause])

  const reset = useCallback(() => {
    pause()
    setIndex(0)
    indexRef.current = 0
  }, [pause])

  useEffect(() => () => clearTimer(), [clearTimer])

  return { tokens, index, playing, wpm, play, pause, toggle, setWpm, jumpSentence, reset }
}
