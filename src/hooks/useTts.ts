import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { stripMarkdown, tokenize, type Token } from '../utils/textTokenizer'
import {
  getVoices,
  isTtsSupported,
  loadVoices,
  observeVoices,
  pauseTts,
  resumeTts,
  speak,
  stopTts,
  type TtsSpeakHandle,
  type TtsVoice,
} from '../platform/tts'

export type TtsStatus = 'idle' | 'loading' | 'speaking' | 'paused' | 'error'

export interface TtsSentence {
  sentenceIndex: number
  text: string
  startTokenIndex: number
  endTokenIndex: number
  tokens: Token[]
  tokenOffsets: number[]
}

export interface TtsProgress {
  status: TtsStatus
  tokenIndex: number
  tokenCount: number
  sentenceIndex: number
  sentenceCount: number
  tokenInSentenceIndex: number
  tokenCountInSentence: number
  currentSentenceText: string
  currentTokenText: string
  fraction: number
  isFinished: boolean
  voiceUri?: string
}

export interface UseTtsOptions {
  text: string
  rate: number
  pitch: number
  voiceUri?: string
  onProgress?: (progress: TtsProgress) => void
}

export interface UseTtsReturn {
  supported: boolean
  voices: TtsVoice[]
  selectedVoice: TtsVoice | null
  status: TtsStatus
  error: Error | null
  isLoadingVoices: boolean
  sentences: TtsSentence[]
  tokenCount: number
  sentenceCount: number
  currentSentenceIndex: number
  currentTokenIndex: number
  currentSentence: TtsSentence | null
  currentToken: Token | null
  progress: TtsProgress
  play: () => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
  nextSentence: () => Promise<void>
  previousSentence: () => Promise<void>
  jumpToSentence: (sentenceIndex: number, autoplay?: boolean) => Promise<void>
  reloadVoices: () => Promise<void>
  toggle: () => Promise<void>
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeText(text: string): string {
  return stripMarkdown(text).replace(/\r\n/g, '\n').trim()
}

function buildTokenOffsets(tokens: Token[]): number[] {
  let cursor = 0
  return tokens.map((token, index) => {
    const start = cursor
    cursor += token.word.length
    if (index < tokens.length - 1) cursor += 1
    return start
  })
}

function buildSentences(tokens: Token[]): TtsSentence[] {
  if (tokens.length === 0) return []

  const sentences: TtsSentence[] = []
  let sentenceStart = 0

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    const isBoundary = token.isSentenceEnd || token.isParagraphEnd || index === tokens.length - 1
    if (!isBoundary) continue

    const sentenceTokens = tokens.slice(sentenceStart, index + 1)
    const tokenOffsets = buildTokenOffsets(sentenceTokens)
    const sentenceText = sentenceTokens.map(t => t.word).join(' ').trim()

    if (sentenceTokens.length > 0 && sentenceText.length > 0) {
      sentences.push({
        sentenceIndex: sentences.length,
        text: sentenceText,
        startTokenIndex: sentenceStart,
        endTokenIndex: index,
        tokens: sentenceTokens,
        tokenOffsets,
      })
    }

    sentenceStart = index + 1
  }

  if (sentences.length === 0) {
    const tokenOffsets = buildTokenOffsets(tokens)
    sentences.push({
      sentenceIndex: 0,
      text: tokens.map(t => t.word).join(' ').trim(),
      startTokenIndex: 0,
      endTokenIndex: tokens.length - 1,
      tokens,
      tokenOffsets,
    })
  }

  return sentences
}

function getSentenceTokenIndex(sentence: TtsSentence, charIndex: number): number {
  if (sentence.tokens.length === 0) return 0
  if (!Number.isFinite(charIndex) || charIndex <= 0) return 0

  let index = 0
  for (let i = 0; i < sentence.tokenOffsets.length; i++) {
    if (charIndex >= sentence.tokenOffsets[i]) {
      index = i
    } else {
      break
    }
  }

  return index
}

function getSentenceProgress(
  sentences: TtsSentence[],
  sentenceIndex: number,
  tokenIndex: number,
  status: TtsStatus,
  finished: boolean,
  voiceUri?: string,
): TtsProgress {
  const safeSentenceIndex = sentences.length === 0
    ? 0
    : clamp(sentenceIndex, 0, sentences.length - 1)
  const sentence = sentences[safeSentenceIndex] ?? null
  const tokenCount = sentences.reduce((count, current) => count + current.tokens.length, 0)
  const currentSentenceTokenCount = sentence?.tokens.length ?? 0
  const tokenCountInSentence = currentSentenceTokenCount
  const tokenInSentenceIndex = sentence && sentence.tokens.length > 0
    ? clamp(tokenIndex - sentence.startTokenIndex, 0, sentence.tokens.length - 1)
    : 0
  const currentToken = sentence?.tokens[tokenInSentenceIndex] ?? null
  const clampedTokenIndex = tokenCount > 0
    ? clamp(tokenIndex, 0, tokenCount - 1)
    : 0
  const fraction = finished
    ? 1
    : tokenCount > 1
      ? clampedTokenIndex / (tokenCount - 1)
      : tokenCount === 1
        ? clampedTokenIndex
        : 0

  return {
    status,
    tokenIndex: tokenCount > 0 && finished ? tokenCount : tokenIndex,
    tokenCount,
    sentenceIndex: safeSentenceIndex,
    sentenceCount: sentences.length,
    tokenInSentenceIndex,
    tokenCountInSentence,
    currentSentenceText: sentence?.text ?? '',
    currentTokenText: currentToken?.word ?? '',
    fraction,
    isFinished: finished,
    voiceUri,
  }
}

function isAbortLikeError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export function useTts(options: UseTtsOptions): UseTtsReturn {
  const supported = isTtsSupported()
  const normalizedText = useMemo(() => normalizeText(options.text), [options.text])
  const tokens = useMemo(() => (normalizedText.length > 0 ? tokenize(normalizedText) : []), [normalizedText])
  const sentences = useMemo(() => buildSentences(tokens), [tokens])

  const [voices, setVoices] = useState<TtsVoice[]>(getVoices())
  const [status, setStatus] = useState<TtsStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [currentTokenIndex, setCurrentTokenIndex] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const currentHandleRef = useRef<TtsSpeakHandle | null>(null)
  const runIdRef = useRef(0)
  const mountedRef = useRef(false)
  const sentenceIndexRef = useRef(0)
  const tokenIndexRef = useRef(0)
  const statusRef = useRef<TtsStatus>('idle')
  const finishedRef = useRef(false)
  const rateRef = useRef(options.rate)
  const pitchRef = useRef(options.pitch)
  const voiceUriRef = useRef(options.voiceUri)
  const onProgressRef = useRef(options.onProgress)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    rateRef.current = options.rate
  }, [options.rate])

  useEffect(() => {
    pitchRef.current = options.pitch
  }, [options.pitch])

  useEffect(() => {
    voiceUriRef.current = options.voiceUri
  }, [options.voiceUri])

  useEffect(() => {
    onProgressRef.current = options.onProgress
  }, [options.onProgress])

  const cancelInternal = useCallback((resetToStart: boolean) => {
    runIdRef.current += 1
    currentHandleRef.current?.cancel()
    currentHandleRef.current = null
    if (mountedRef.current) {
      setStatus('idle')
      setError(null)
      setIsFinished(false)
      if (resetToStart) {
        sentenceIndexRef.current = 0
        tokenIndexRef.current = 0
        setCurrentSentenceIndex(0)
        setCurrentTokenIndex(0)
      }
    }
    statusRef.current = 'idle'
    finishedRef.current = false
  }, [])

  useEffect(() => {
    cancelInternal(true)
  }, [cancelInternal, normalizedText])

  useEffect(() => {
    if (!supported) return

    let alive = true
    const syncVoices = (next: TtsVoice[]) => {
      if (!alive) return
      setVoices(next)
    }

    syncVoices(getVoices())
    const unsubscribe = observeVoices(syncVoices)
    void loadVoices().then(syncVoices).catch(() => undefined)

    return () => {
      alive = false
      unsubscribe()
    }
  }, [supported])

  const selectedVoice = useMemo(() => {
    if (!options.voiceUri) return voices.find(voice => voice.default) ?? voices[0] ?? null
    return voices.find(voice => voice.voiceURI === options.voiceUri) ?? voices.find(voice => voice.default) ?? voices[0] ?? null
  }, [options.voiceUri, voices])

  const progress = useMemo(() => {
    return getSentenceProgress(
      sentences,
      currentSentenceIndex,
      currentTokenIndex,
      status,
      isFinished,
      voiceUriRef.current,
    )
  }, [currentSentenceIndex, currentTokenIndex, isFinished, sentences, status])

  useEffect(() => {
    sentenceIndexRef.current = currentSentenceIndex
  }, [currentSentenceIndex])

  useEffect(() => {
    tokenIndexRef.current = currentTokenIndex
  }, [currentTokenIndex])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    finishedRef.current = isFinished
  }, [isFinished])

  useEffect(() => {
    onProgressRef.current?.(progress)
  }, [progress])

  const setCursor = useCallback((sentenceIndex: number, tokenIndex: number) => {
    const safeSentenceIndex = sentences.length === 0
      ? 0
      : clamp(sentenceIndex, 0, sentences.length - 1)
    const safeTokenIndex = tokens.length === 0
      ? 0
      : clamp(tokenIndex, 0, tokens.length)
    sentenceIndexRef.current = safeSentenceIndex
    tokenIndexRef.current = safeTokenIndex
    setCurrentSentenceIndex(safeSentenceIndex)
    setCurrentTokenIndex(safeTokenIndex)
  }, [sentences.length, tokens.length])

  const startPlayback = useCallback(async (sentenceIndex: number) => {
    if (!supported || sentences.length === 0) return

    const startIndex = clamp(sentenceIndex, 0, sentences.length - 1)
    const runId = ++runIdRef.current
    currentHandleRef.current?.cancel()
    currentHandleRef.current = null
    setError(null)
    setIsFinished(false)
    setIsLoadingVoices(true)
    setStatus('loading')
    statusRef.current = 'loading'
    stopTts()

    const voicesReady = await loadVoices()
    if (!mountedRef.current) return
    if (runId !== runIdRef.current) {
      return
    }
    setVoices(voicesReady.length > 0 ? voicesReady : getVoices())
    setIsLoadingVoices(false)
    let cursor = startIndex

    while (mountedRef.current && runId === runIdRef.current && cursor < sentences.length) {
      const sentence = sentences[cursor]
      setCursor(cursor, sentence.startTokenIndex)
      setStatus('speaking')
      statusRef.current = 'speaking'

      const handle = speak(sentence.text, {
        rate: rateRef.current,
        pitch: pitchRef.current,
        voiceUri: voiceUriRef.current,
        onBoundary: (event) => {
          if (!mountedRef.current || runId !== runIdRef.current) return
          const tokenOffset = getSentenceTokenIndex(sentence, event.charIndex)
          setCursor(cursor, sentence.startTokenIndex + tokenOffset)
        },
        onError: (synthesisError) => {
          if (!mountedRef.current || runId !== runIdRef.current) return
          setStatus('error')
          statusRef.current = 'error'
          setError(synthesisError)
        },
      })

      if (!handle) {
        setStatus('error')
        statusRef.current = 'error'
        setError(new Error('Speech synthesis is unavailable'))
        return
      }

      currentHandleRef.current = handle

      try {
        await handle.done
      } catch (caughtError) {
        if (!mountedRef.current || runId !== runIdRef.current) return
        if (isAbortLikeError(caughtError)) {
          return
        }
        setStatus('error')
        statusRef.current = 'error'
        setError(caughtError instanceof Error ? caughtError : new Error('Speech synthesis failed'))
        return
      } finally {
        if (currentHandleRef.current === handle) {
          currentHandleRef.current = null
        }
      }

      cursor += 1
      if (cursor < sentences.length) {
        setCursor(cursor, sentences[cursor].startTokenIndex)
      }
    }

    if (mountedRef.current && runId === runIdRef.current) {
      setIsFinished(true)
      finishedRef.current = true
      setStatus('idle')
      statusRef.current = 'idle'
      setCursor(Math.max(0, sentences.length - 1), tokens.length)
    }
  }, [sentences, setCursor, supported, tokens.length])

  const play = useCallback(async () => {
    if (!supported || sentences.length === 0) return
    const atEnd = finishedRef.current || sentenceIndexRef.current >= sentences.length - 1 && tokenIndexRef.current >= tokens.length
    const startIndex = atEnd ? 0 : sentenceIndexRef.current
    await startPlayback(startIndex)
  }, [sentences.length, startPlayback, supported, tokens.length])

  const pause = useCallback(() => {
    if (statusRef.current !== 'speaking') return
    pauseTts()
    setStatus('paused')
    statusRef.current = 'paused'
  }, [])

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return
    resumeTts()
    setStatus('speaking')
    statusRef.current = 'speaking'
  }, [])

  const stop = useCallback(() => {
    stopTts()
    cancelInternal(true)
  }, [cancelInternal])

  const jumpToSentence = useCallback(async (sentenceIndex: number, autoplay = false) => {
    if (sentences.length === 0) return
    const nextIndex = clamp(sentenceIndex, 0, sentences.length - 1)
    stopTts()
    cancelInternal(false)
    setIsFinished(false)
    setCursor(nextIndex, sentences[nextIndex].startTokenIndex)
    if (autoplay) {
      await startPlayback(nextIndex)
    } else {
      setStatus('idle')
      statusRef.current = 'idle'
    }
  }, [cancelInternal, sentences, setCursor, startPlayback])

  const nextSentence = useCallback(async () => {
    if (sentences.length === 0) return
    const autoplay = statusRef.current === 'speaking' || statusRef.current === 'paused' || isFinished
    const nextIndex = Math.min(sentenceIndexRef.current + 1, sentences.length - 1)
    await jumpToSentence(nextIndex, autoplay && nextIndex > sentenceIndexRef.current)
  }, [isFinished, jumpToSentence, sentences.length])

  const previousSentence = useCallback(async () => {
    if (sentences.length === 0) return
    const autoplay = statusRef.current === 'speaking'
    const previousIndex = Math.max(sentenceIndexRef.current - 1, 0)
    await jumpToSentence(previousIndex, autoplay)
  }, [jumpToSentence, sentences.length])

  const reloadVoices = useCallback(async () => {
    if (!supported) {
      setVoices([])
      return
    }
    setIsLoadingVoices(true)
    const nextVoices = await loadVoices()
    if (!mountedRef.current) return
    setVoices(nextVoices.length > 0 ? nextVoices : getVoices())
    setIsLoadingVoices(false)
  }, [supported])

  const toggle = useCallback(async () => {
    if (statusRef.current === 'speaking') {
      pause()
      return
    }
    if (statusRef.current === 'paused') {
      resume()
      return
    }
    await play()
  }, [pause, play, resume])

  return {
    supported,
    voices,
    selectedVoice,
    status,
    error,
    isLoadingVoices,
    sentences,
    tokenCount: tokens.length,
    sentenceCount: sentences.length,
    currentSentenceIndex,
    currentTokenIndex,
    currentSentence: sentences[currentSentenceIndex] ?? null,
    currentToken: (() => {
      const sentence = sentences[currentSentenceIndex]
      if (!sentence || sentence.tokens.length === 0) return null
      const tokenOffset = clamp(currentTokenIndex - sentence.startTokenIndex, 0, sentence.tokens.length - 1)
      return sentence.tokens[tokenOffset] ?? null
    })(),
    progress,
    play,
    pause,
    resume,
    stop,
    nextSentence,
    previousSentence,
    jumpToSentence,
    reloadVoices,
    toggle,
  }
}
