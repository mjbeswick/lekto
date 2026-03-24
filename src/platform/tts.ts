export interface TtsVoice {
  voiceURI: string
  name: string
  lang: string
  default: boolean
  localService: boolean
}

export interface TtsBoundaryEvent {
  charIndex: number
  charLength: number
  name?: string
}

export interface TtsSpeakOptions {
  rate?: number
  pitch?: number
  voiceUri?: string
  onBoundary?: (event: TtsBoundaryEvent) => void
  onEnd?: () => void
  onError?: (error: Error) => void
}

export interface TtsSpeakHandle {
  done: Promise<void>
  pause: () => void
  resume: () => void
  cancel: () => void
}

function isBrowserSpeechAvailable(): boolean {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window
}

export function isTtsSupported(): boolean {
  return isBrowserSpeechAvailable()
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  return isBrowserSpeechAvailable() ? window.speechSynthesis : null
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeVoice(voice: SpeechSynthesisVoice): TtsVoice {
  return {
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    default: voice.default,
    localService: voice.localService,
  }
}

let voiceCache: TtsVoice[] = []
let voiceLoadPromise: Promise<TtsVoice[]> | null = null

function readVoices(): TtsVoice[] {
  const synth = getSpeechSynthesis()
  if (!synth) return []
  const voices = synth.getVoices().map(normalizeVoice)
  voiceCache = voices
  return voices
}

export function getVoices(): TtsVoice[] {
  return voiceCache.length > 0 ? voiceCache : readVoices()
}

export function loadVoices(timeoutMs = 1200): Promise<TtsVoice[]> {
  if (!isTtsSupported()) return Promise.resolve([])

  const current = readVoices()
  if (current.length > 0) return Promise.resolve(current)
  if (voiceLoadPromise) return voiceLoadPromise

  const synth = getSpeechSynthesis()
  if (!synth) return Promise.resolve([])

  voiceLoadPromise = new Promise<TtsVoice[]>((resolve) => {
    let settled = false
    const startedAt = Date.now()
    let timeoutId: number | null = null
    let pollId: number | null = null

    const cleanup = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      if (pollId !== null) window.clearInterval(pollId)
      synth.removeEventListener('voiceschanged', onVoicesChanged)
      voiceLoadPromise = null
    }

    const settle = (force = false) => {
      if (settled) return
      const voices = readVoices()
      if (voices.length > 0 || force) {
        settled = true
        cleanup()
        resolve(voices)
      }
    }

    const onVoicesChanged = () => settle()

    synth.addEventListener('voiceschanged', onVoicesChanged)
    timeoutId = window.setTimeout(() => settle(true), timeoutMs)
    pollId = window.setInterval(() => {
      if (Date.now() - startedAt > timeoutMs) {
        settle(true)
        return
      }
      settle()
    }, 100)

    settle()
  })

  return voiceLoadPromise
}

export function observeVoices(listener: (voices: TtsVoice[]) => void): () => void {
  const synth = getSpeechSynthesis()
  if (!synth) return () => {}

  const onVoicesChanged = () => {
    listener(readVoices())
  }

  synth.addEventListener('voiceschanged', onVoicesChanged)
  listener(readVoices())

  return () => {
    synth.removeEventListener('voiceschanged', onVoicesChanged)
  }
}

function resolveVoice(voiceUri?: string): SpeechSynthesisVoice | undefined {
  const synth = getSpeechSynthesis()
  if (!synth) return undefined

  const voices = synth.getVoices()
  if (voiceUri) {
    const exact = voices.find(voice => voice.voiceURI === voiceUri)
    if (exact) return exact
  }

  return voices.find(voice => voice.default) ?? voices[0]
}

function createAbortError(message: string): Error {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

function createSpeechError(message: string): Error {
  const error = new Error(message)
  error.name = 'SpeechSynthesisError'
  return error
}

export function speak(text: string, options: TtsSpeakOptions = {}): TtsSpeakHandle | null {
  const synth = getSpeechSynthesis()
  const trimmed = text.trim()
  if (!synth || trimmed.length === 0) return null

  synth.cancel()

  const utterance = new SpeechSynthesisUtterance(trimmed)
  utterance.rate = clamp(options.rate ?? 1, 0.1, 10)
  utterance.pitch = clamp(options.pitch ?? 1, 0, 2)

  const voice = resolveVoice(options.voiceUri)
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang || utterance.lang
  }

  let settled = false
  let resolveDone!: () => void
  let rejectDone!: (error: Error) => void

  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve
    rejectDone = reject
  })

  const settleResolve = () => {
    if (settled) return
    settled = true
    options.onEnd?.()
    resolveDone()
  }

  const settleReject = (error: Error) => {
    if (settled) return
    settled = true
    options.onError?.(error)
    rejectDone(error)
  }

  utterance.onboundary = (event) => {
    if (settled) return
    options.onBoundary?.({
      charIndex: event.charIndex,
      charLength: event.charLength,
      name: event.name,
    })
  }

  utterance.onend = () => {
    settleResolve()
  }

  utterance.onerror = (event) => {
    const error = createSpeechError(event.error || 'Speech synthesis failed')
    settleReject(error)
  }

  synth.speak(utterance)

  return {
    done,
    pause: () => synth.pause(),
    resume: () => synth.resume(),
    cancel: () => {
      if (settled) return
      synth.cancel()
      settleReject(createAbortError('Speech synthesis cancelled'))
    },
  }
}

export function pauseTts(): void {
  const synth = getSpeechSynthesis()
  if (synth?.speaking && !synth.paused) synth.pause()
}

export function resumeTts(): void {
  const synth = getSpeechSynthesis()
  if (synth?.paused) synth.resume()
}

export function stopTts(): void {
  const synth = getSpeechSynthesis()
  synth?.cancel()
}
