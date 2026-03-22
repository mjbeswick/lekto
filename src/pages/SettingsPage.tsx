import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { useAppStore } from '../store/appStore'
import type { Theme } from '../types'

const THEMES: { label: string; value: Theme }[] = [
  { label: '☀️ Light', value: 'light' },
  { label: '🌙 Dark', value: 'dark' },
  { label: '📜 Sepia', value: 'sepia' },
]

const FONTS = [
  { label: 'Serif', value: 'serif' },
  { label: 'Sans-serif', value: 'sans' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme, fontSize, setFontSize, fontFamily, setFontFamily, lineHeight, setLineHeight,
    defaultWpm, setDefaultWpm, wordLengthScaling, setWordLengthScaling, rsvpChunkLetters, setRsvpChunkLetters } = useAppStore()

  return (
    <div className="min-h-screen px-5 pt-safe-top pt-6 pb-8" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-orange-500 p-1"><FontAwesomeIcon icon={faChevronLeft} size="lg" /></button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3">Theme</h2>
        <div className="flex gap-3">
          {THEMES.map(t => (
            <button key={t.value} onClick={() => setTheme(t.value)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${theme === t.value ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950' : 'border-gray-200 dark:border-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3">Font</h2>
        <div className="flex gap-3 mb-4">
          {FONTS.map(f => (
            <button key={f.value} onClick={() => setFontFamily(f.value)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 ${fontFamily === f.value ? 'border-orange-500' : 'border-gray-200 dark:border-gray-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between">
          <span className="text-sm">Font size: {fontSize}px</span>
          <input type="range" min={12} max={28} value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
            className="w-40 accent-orange-500" />
        </label>
        <label className="flex items-center justify-between mt-3">
          <span className="text-sm">Line height: {lineHeight}</span>
          <input type="range" min={1.2} max={2.4} step={0.1} value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))}
            className="w-40 accent-orange-500" />
        </label>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3">Speed Reading</h2>
        <label className="flex items-center justify-between mb-4">
          <span className="text-sm">Default WPM: {defaultWpm}</span>
          <input type="range" min={100} max={1000} step={25} value={defaultWpm} onChange={e => setDefaultWpm(Number(e.target.value))}
            className="w-40 accent-orange-500" />
        </label>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm">Scale time by word length</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Longer words get more display time</p>
          </div>
          <button
            onClick={() => setWordLengthScaling(!wordLengthScaling)}
            className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${wordLengthScaling ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            role="switch"
            aria-checked={wordLengthScaling}
          >
            <span
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200"
              style={{ left: 4, transform: wordLengthScaling ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Letters per flash: {rsvpChunkLetters <= 1 ? 'Off' : rsvpChunkLetters}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {rsvpChunkLetters <= 1 ? 'Single word' : `Groups words to ~${rsvpChunkLetters} chars`}
            </p>
          </div>
          <input
            type="range" min={1} max={25} step={1} value={rsvpChunkLetters}
            onChange={e => setRsvpChunkLetters(Number(e.target.value))}
            className="w-32 accent-orange-500"
          />
        </div>
      </section>
    </div>
  )
}
