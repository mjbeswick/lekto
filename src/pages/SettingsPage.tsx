import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faSun, faMoon, faCircleHalfStroke, faMobileScreen } from '@fortawesome/free-solid-svg-icons'
import { useAppStore } from '../store/appStore'
import { useReaderModeStore } from '../hooks/useReaderMode'
import type { Theme } from '../types'
import HeaderIconButton from '../components/HeaderIconButton'
import { READER_FONTS } from '../utils/readerFonts'

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

export default function SettingsPage() {
  const navigate = useNavigate()
  const {
    theme, setTheme, accentColor, setAccentColor,
    fontSize, setFontSize, fontFamily, setFontFamily, lineHeight, setLineHeight,
    paragraphSpacing, setParagraphSpacing,
    maxWidth, setMaxWidth,
    removeBookMargins, setRemoveBookMargins,
    removePageBackground, setRemovePageBackground,
    fullscreenHeaderAutohide, setFullscreenHeaderAutohide,
    scrollPageFill, setScrollPageFill,
    defaultWpm, setDefaultWpm, wordLengthScaling, setWordLengthScaling,
    rsvpChunkLetters, setRsvpChunkLetters,
    rsvpShowContext, setRsvpShowContext,
    rsvpFontSize, setRsvpFontSize,
  } = useAppStore()
  const { layout, setLayout } = useReaderModeStore()

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
      <div className="flex items-center gap-3 px-[var(--app-gutter)] pb-5 flex-shrink-0" style={{ paddingTop: 'calc(1.25rem + var(--safe-top))' }}>
        <HeaderIconButton onClick={() => navigate(-1)} title="Back" aria-label="Back">
          <FontAwesomeIcon icon={faArrowLeft} />
        </HeaderIconButton>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div
        className="flex-1 overflow-y-auto px-[var(--app-gutter)] pb-8"
        style={{ paddingBottom: 'calc(2rem + var(--safe-bottom))', WebkitOverflowScrolling: 'touch' }}
      >
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Reading layout</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLayout('scroll')}
            className="rounded-xl border-2 px-4 py-3 text-left transition-colors"
            style={{
              borderColor: layout === 'scroll' ? 'var(--reader-accent)' : 'var(--border)',
              color: layout === 'scroll' ? 'var(--reader-accent)' : 'var(--reader-fg)',
            }}
          >
            <div className="text-sm font-medium">Scroll</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Continuous reading for supported books</div>
          </button>
          <button
            onClick={() => setLayout('pages')}
            className="rounded-xl border-2 px-4 py-3 text-left transition-colors"
            style={{
              borderColor: layout === 'pages' ? 'var(--reader-accent)' : 'var(--border)',
              color: layout === 'pages' ? 'var(--reader-accent)' : 'var(--reader-fg)',
            }}
          >
            <div className="text-sm font-medium">Pages</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Paginated layout for supported books</div>
          </button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Theme</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
        <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3">
          {READER_FONTS.map(f => (
            <button
              key={f.value}
              onClick={() => setFontFamily(f.value)}
              className="min-h-14 px-3 py-3 rounded-xl text-sm font-medium border-2 text-center"
              style={{
                fontFamily: f.previewFamily,
                borderColor: fontFamily === f.value ? 'var(--reader-accent)' : 'var(--border)',
                color: fontFamily === f.value ? 'var(--reader-accent)' : 'var(--reader-fg)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm">Font size: {fontSize}px</span>
          <input type="range" min={12} max={28} value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
            className="w-full sm:w-40" style={{ accentColor: 'var(--reader-accent)' }} />
        </label>
        <label className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm">Line height: {lineHeight}</span>
          <input type="range" min={1.2} max={2.4} step={0.1} value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))}
            className="w-full sm:w-40" style={{ accentColor: 'var(--reader-accent)' }} />
        </label>
        <label className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm">Paragraph spacing: {paragraphSpacing.toFixed(1)}em</span>
          <input type="range" min={0} max={2.4} step={0.1} value={paragraphSpacing} onChange={e => setParagraphSpacing(Number(e.target.value))}
            className="w-full sm:w-40" style={{ accentColor: 'var(--reader-accent)' }} />
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
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-sm">Remove book margins</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Use the full page width without reader padding</p>
          </div>
          <button
            onClick={() => setRemoveBookMargins(!removeBookMargins)}
            className="relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200"
            style={{ backgroundColor: removeBookMargins ? 'var(--reader-accent)' : 'var(--surface-2)' }}
            role="switch"
            aria-checked={removeBookMargins}
          >
            <span
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200"
              style={{ left: 4, transform: removeBookMargins ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-sm">Remove page background</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Make the page transparent and show only the reader canvas</p>
          </div>
          <button
            onClick={() => setRemovePageBackground(!removePageBackground)}
            className="relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200"
            style={{ backgroundColor: removePageBackground ? 'var(--reader-accent)' : 'var(--surface-2)' }}
            role="switch"
            aria-checked={removePageBackground}
          >
            <span
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200"
              style={{ left: 4, transform: removePageBackground ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-sm">Fullscreen reader</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Auto-hide the header and reveal it from the top edge</p>
          </div>
          <button
            onClick={() => setFullscreenHeaderAutohide(!fullscreenHeaderAutohide)}
            className="relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200"
            style={{ backgroundColor: fullscreenHeaderAutohide ? 'var(--reader-accent)' : 'var(--surface-2)' }}
            role="switch"
            aria-checked={fullscreenHeaderAutohide}
          >
            <span
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200"
              style={{ left: 4, transform: fullscreenHeaderAutohide ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
        {layout === 'scroll' && (
          <div className="mt-4">
            <p className="text-sm">Scroll page fill</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>For page-based scroll views, fit each page by viewport width or height</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                onClick={() => setScrollPageFill('width')}
                className="rounded-xl border-2 px-4 py-3 text-left transition-colors"
                style={{
                  borderColor: scrollPageFill === 'width' ? 'var(--reader-accent)' : 'var(--border)',
                  color: scrollPageFill === 'width' ? 'var(--reader-accent)' : 'var(--reader-fg)',
                }}
              >
                <div className="text-sm font-medium">Fill Width</div>
              </button>
              <button
                onClick={() => setScrollPageFill('height')}
                className="rounded-xl border-2 px-4 py-3 text-left transition-colors"
                style={{
                  borderColor: scrollPageFill === 'height' ? 'var(--reader-accent)' : 'var(--border)',
                  color: scrollPageFill === 'height' ? 'var(--reader-accent)' : 'var(--reader-fg)',
                }}
              >
                <div className="text-sm font-medium">Fill Height</div>
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Speed Reading</h2>
        <label className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm">Default WPM: {defaultWpm}</span>
          <input type="range" min={100} max={2000} step={25} value={defaultWpm} onChange={e => setDefaultWpm(Number(e.target.value))}
            className="w-full sm:w-40" style={{ accentColor: 'var(--reader-accent)' }} />
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

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm">Show context words</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Display previous and next words greyed out</p>
          </div>
          <button
            onClick={() => setRsvpShowContext(!rsvpShowContext)}
            className="relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200"
            style={{ backgroundColor: rsvpShowContext ? 'var(--reader-accent)' : 'var(--surface-2)' }}
            role="switch"
            aria-checked={rsvpShowContext}
          >
            <span
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200"
              style={{ left: 4, transform: rsvpShowContext ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm">Letters per flash: {rsvpChunkLetters <= 1 ? 'Off' : rsvpChunkLetters}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {rsvpChunkLetters <= 1 ? 'Single word' : `Groups words to ~${rsvpChunkLetters} chars`}
            </p>
          </div>
          <input
            type="range" min={1} max={25} step={1} value={rsvpChunkLetters}
            onChange={e => setRsvpChunkLetters(Number(e.target.value))}
            className="w-full sm:w-40" style={{ accentColor: 'var(--reader-accent)' }} />
        </div>

        <label className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm">Speed reader font size: {rsvpFontSize}px</span>
          <input type="range" min={32} max={80} step={2} value={rsvpFontSize} onChange={e => setRsvpFontSize(Number(e.target.value))}
            className="w-full sm:w-40" style={{ accentColor: 'var(--reader-accent)' }} />
        </label>
      </section>
      </div>
    </div>
  )
}
