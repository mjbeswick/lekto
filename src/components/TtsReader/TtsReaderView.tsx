import { useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBackwardStep,
  faCaretDown,
  faForwardStep,
  faPause,
  faPlay,
  faRotateLeft,
  faStop,
  faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons'
import { useTts, type TtsProgress } from '../../hooks/useTts'

interface Props {
  text: string
  extracting?: boolean
  rate: number
  pitch: number
  voiceUri?: string
  onRateChange?: (rate: number) => void
  onPitchChange?: (pitch: number) => void
  onVoiceChange?: (voiceUri?: string) => void
  onProgress?: (progress: TtsProgress) => void
  className?: string
}

function formatRate(rate: number): string {
  return `${rate.toFixed(rate < 1.5 ? 1 : 2)}x`
}

function formatProgress(value: number): string {
  return `${Math.round(value * 100)}%`
}

function voiceLabel(voiceUri?: string): string {
  if (!voiceUri) return 'Default voice'
  return voiceUri
}

export default function TtsReaderView({
  text,
  extracting = false,
  rate,
  pitch,
  voiceUri,
  onRateChange,
  onPitchChange,
  onVoiceChange,
  onProgress,
  className,
}: Props) {
  const tts = useTts({ text, rate, pitch, voiceUri, onProgress })

  const currentSentence = tts.currentSentence?.text || 'Add text to start listening.'
  const isActionDisabled = extracting || !tts.supported || tts.sentences.length === 0
  const selectedVoice = useMemo(() => {
    if (!voiceUri) return tts.selectedVoice
    return tts.voices.find(voice => voice.voiceURI === voiceUri) ?? tts.selectedVoice
  }, [tts.selectedVoice, tts.voices, voiceUri])
  const displayedVoiceName = selectedVoice
    ? `${selectedVoice.name}${selectedVoice.lang ? ` · ${selectedVoice.lang}` : ''}`
    : 'Default voice'

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden ${className ?? ''}`}
      style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}
    >
      <div className="h-1 flex-shrink-0" style={{ backgroundColor: 'var(--surface-2)' }}>
        <div
          className="h-1 transition-[width] duration-150"
          style={{ width: `${Math.max(0, Math.min(100, tts.progress.fraction * 100))}%`, backgroundColor: 'var(--reader-accent)' }}
        />
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-5 overflow-hidden px-[var(--app-gutter)] py-4 sm:py-6">
        <section className="rounded-3xl border p-4 sm:p-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>Text to Speech</p>
              <h2 className="mt-1 text-lg font-semibold sm:text-xl">Speak the current text aloud</h2>
            </div>
            <div className="text-right text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
              <div>{tts.status.toUpperCase()}</div>
              <div>{formatProgress(tts.progress.fraction)}</div>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {extracting
              ? 'Extracting text for speech playback.'
              : tts.supported
              ? `Using ${displayedVoiceName}. ${tts.progress.isFinished ? 'Playback finished.' : 'Playback follows sentence boundaries and tracks the active word when the browser exposes boundary events.'}`
              : 'Speech synthesis is not available in this browser.'}
          </p>

          <div className="mt-5 rounded-2xl border p-4" style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--border)' }}>
            <p className="text-[0.7rem] uppercase tracking-[0.35em]" style={{ color: 'var(--text-muted)' }}>Current sentence</p>
            <p className="mt-3 text-lg leading-relaxed sm:text-xl">{extracting ? 'Extracting text…' : currentSentence}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{tts.progress.sentenceIndex + 1}/{Math.max(1, tts.progress.sentenceCount)}</span>
              <span>{tts.progress.tokenInSentenceIndex + 1}/{Math.max(1, tts.progress.tokenCountInSentence)}</span>
              <span>{tts.progress.currentTokenText ? `Word: ${tts.progress.currentTokenText}` : 'Word: —'}</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <FontAwesomeIcon icon={faVolumeHigh} />
              Playback
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void tts.previousSentence()}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border transition-opacity active:opacity-60 disabled:opacity-40"
                style={{ borderColor: 'var(--border)' }}
                disabled={isActionDisabled}
                aria-label="Previous sentence"
              >
                <FontAwesomeIcon icon={faBackwardStep} />
              </button>

              <button
                type="button"
                onClick={() => void tts.toggle()}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl font-semibold transition-opacity active:opacity-60 disabled:opacity-40"
                style={{ backgroundColor: 'var(--reader-accent)', color: 'white' }}
                disabled={!tts.supported || tts.sentences.length === 0 && tts.status !== 'paused'}
                aria-label={tts.status === 'speaking' ? 'Pause' : 'Play'}
              >
                <FontAwesomeIcon icon={tts.status === 'speaking' ? faPause : faPlay} />
                {tts.status === 'speaking' ? 'Pause' : tts.status === 'paused' ? 'Resume' : 'Play'}
              </button>

              <button
                type="button"
                onClick={() => void tts.nextSentence()}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border transition-opacity active:opacity-60 disabled:opacity-40"
                style={{ borderColor: 'var(--border)' }}
                disabled={isActionDisabled}
                aria-label="Next sentence"
              >
                <FontAwesomeIcon icon={faForwardStep} />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => tts.stop()}
                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-opacity active:opacity-60 disabled:opacity-40"
                style={{ borderColor: 'var(--border)' }}
                disabled={!tts.supported}
              >
                <FontAwesomeIcon icon={faStop} />
                Stop
              </button>
              <button
                type="button"
                onClick={() => void tts.reloadVoices()}
                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-opacity active:opacity-60 disabled:opacity-40"
                style={{ borderColor: 'var(--border)' }}
                disabled={!tts.supported || tts.isLoadingVoices}
              >
                <FontAwesomeIcon icon={faRotateLeft} />
                Refresh voices
              </button>
            </div>
          </div>

          <div className="rounded-3xl border p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <FontAwesomeIcon icon={faCaretDown} />
              Voice and rate
            </div>

            <label className="mt-4 block">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Voice</span>
                <span style={{ color: 'var(--text-muted)' }}>{tts.isLoadingVoices ? 'Loading…' : voiceLabel(voiceUri)}</span>
              </div>
              <select
                value={voiceUri ?? ''}
                onChange={event => onVoiceChange?.(event.target.value || undefined)}
                disabled={!tts.supported || tts.voices.length === 0}
                className="w-full rounded-2xl border px-3 py-3 text-sm outline-none transition-colors"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--reader-bg)' }}
              >
                <option value="">Default voice</option>
                {tts.voices.map(voice => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} {voice.lang ? `(${voice.lang})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Rate</span>
                <span style={{ color: 'var(--text-muted)' }}>{formatRate(rate)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={rate}
                onChange={event => onRateChange?.(Number(event.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--reader-accent)' }}
              />
            </label>

            <label className="mt-4 block">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Pitch</span>
                <span style={{ color: 'var(--text-muted)' }}>{pitch.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={pitch}
                onChange={event => onPitchChange?.(Number(event.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--reader-accent)' }}
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Playback progress</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {tts.progress.tokenIndex + 1}/{Math.max(1, tts.progress.tokenCount)} tokens
              </p>
            </div>
            <div className="text-right text-sm" style={{ color: 'var(--text-muted)' }}>
              {tts.supported ? 'Sentence-based playback' : 'Unsupported'}
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full" style={{ backgroundColor: 'var(--surface-2)' }}>
            <div
              className="h-2 rounded-full transition-[width] duration-150"
              style={{ width: `${Math.max(0, Math.min(100, tts.progress.fraction * 100))}%`, backgroundColor: 'var(--reader-accent)' }}
            />
          </div>
          {tts.error && (
            <p className="mt-3 text-sm" style={{ color: 'var(--danger, #dc2626)' }}>
              {tts.error.message}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
