import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faSun, faMoon, faCircleHalfStroke, faMobileScreen } from '@fortawesome/free-solid-svg-icons'
import { useAppStore } from '../store/appStore'
import type { Theme } from '../types'

const THEMES: { label: string; value: Theme; icon: any }[] = [
  { label: 'Light',  value: 'light',  icon: faSun },
  { label: 'Dark',   value: 'dark',   icon: faMoon },
  { label: 'AMOLED', value: 'amoled', icon: faMobileScreen },
  { label: 'Sepia',  value: 'sepia',  icon: faCircleHalfStroke },
]

const ACCENTS = [
  { label: 'Orange', value: '#f97316' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Rose',   value: '#f43f5e' },
  { label: 'Teal',   value: '#14b8a6' },
]

const FONTS = [
  { label: 'Serif',      value: 'serif' },
  { label: 'Sans-serif', value: 'sans'  },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const {
    theme, setTheme, accentColor, setAccentColor,
    fontSize, setFontSize, fontFamily, setFontFamily, lineHeight, setLineHeight,
    maxWidth, setMaxWidth,
    defaultWpm, setDefaultWpm, wordLengthScaling, setWordLengthScaling,
    rsvpChunkLetters, setRsvpChunkLetters,
  } = useAppStore()

  return (
    <div className="min-h-screen px-5 pb-8" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)', paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="p-1" style={{ color: 'var(--reader-accent)' }}>
          <FontAwesomeIcon icon={faChevronLeft} size="lg" />
        </button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Theme</h2>
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map(t => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium border-2 transition-colors"
              style={{
                borderColor: theme === t.value ? 'var(--reader-accent)' : 'var(--border)',
                color: theme === t.value ? 'var(--reader-accent)' : 'var(--reader-fg)',
              }}
            >
              <FontAwesomeIcon icon={t.icon} />
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Accent color</h2>
        <div className="flex gap-3 flex-wrap">
          {ACCENTS.map(a => (
            <button
              key={a.value}
              onClick={() => setAccentColor(a.value)}
              title={a.label}
              className="w-8 h-8 rounded-full transition-transform"
              style={{
                backgroundColor: a.value,
                outline: accentColor === a.value ? `3px solid ${a.value}` : '3px solid transparent',
                outlineOffset: 2,
                transform: accentColor === a.value ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Font</h2>
        <div className="flex gap-3 mb-4">
          {FONTS.map(f => (
            <button
              key={f.value}
              onClick={() => setFontFamily(f.value)}
              className="flex-1 py-3 rounded-xl text-sm font-medium border-2"
              style={{
                borderColor: fontFamily === f.value ? 'var(--reader-accent)' : 'var(--border)',
                color: fontFamily === f.value ? 'var(--reader-accent)' : 'var(--reader-fg)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between">
          <span className="text-sm">Font size: {fontSize}px</span>
          <input type="range" min={12} max={28} value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
            className="w-40" style={{ accentColor: 'var(--reader-accent)' }} />
        </label>
        <label className="flex items-center justify-between mt-3">
          <span className="text-sm">Line height: {lineHeight}</span>
          <input type="range" min={1.2} max={2.4} step={0.1} value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))}
            className="w-40" style={{ accentColor: 'var(--reader-accent)' }} />
        </label>
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-sm">Limit line width</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Constrain text to a readable column width</p>
          </div>
          <button
            onClick={() => setMaxWidth(!maxWidth)}
            className="relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200"
            style={{ backgroundColor: maxWidth ? 'var(--reader-accent)' : 'var(--surface-2)' }}
            role="switch"
            aria-checked={maxWidth}
          >
            <span
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200"
              style={{ left: 4, transform: maxWidth ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Speed Reading</h2>
        <label className="flex items-center justify-between mb-4">
          <span className="text-sm">Default WPM: {defaultWpm}</span>
          <input type="range" min={100} max={2000} step={25} value={defaultWpm} onChange={e => setDefaultWpm(Number(e.target.value))}
            className="w-40" style={{ accentColor: 'var(--reader-accent)' }} />
        </label>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm">Scale time by word length</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Longer words get more display time</p>
          </div>
          <button
            onClick={() => setWordLengthScaling(!wordLengthScaling)}
            className="relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200"
            style={{ backgroundColor: wordLengthScaling ? 'var(--reader-accent)' : 'var(--surface-2)' }}
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
            className="w-40" style={{ accentColor: 'var(--reader-accent)' }} />
        </div>
      </section>
    </div>
  )
}
