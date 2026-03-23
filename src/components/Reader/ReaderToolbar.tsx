import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faBars, faBolt, faBook, faGear } from '@fortawesome/free-solid-svg-icons'
import { useReaderModeStore } from '../../hooks/useReaderMode'

interface Props {
  title: string
  onTogglePanel?: () => void
}

export default function ReaderToolbar({ title, onTogglePanel }: Props) {
  const navigate = useNavigate()
  const { mode, layout, toggleMode, toggleLayout } = useReaderModeStore()

  return (
    <div
      className="flex items-center justify-between px-4 pb-3 flex-shrink-0 border-b"
      style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--border)', paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
    >
      <div className="flex items-center gap-1 -ml-1">
        <button onClick={() => navigate('/library')} className="p-1 w-8 flex items-center justify-center" style={{ color: 'var(--reader-accent)' }}>
          <FontAwesomeIcon icon={faChevronLeft} size="lg" />
        </button>
        {onTogglePanel && mode === 'ebook' && (
          <button onClick={onTogglePanel} className="p-1.5 w-8 flex items-center justify-center" title="Contents & Bookmarks" style={{ color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={faBars} />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-0.5 flex-1 mx-2 min-w-0">
        <h1 className="text-sm font-semibold truncate max-w-full leading-tight">{title}</h1>
        {mode === 'ebook' && (
          <button onClick={toggleLayout} className="text-xs leading-none" style={{ color: 'var(--text-muted)' }}>
            {layout === 'scroll' ? '↕ Scroll' : '↔ Pages'}
          </button>
        )}
      </div>

      <div className="flex gap-1 items-center">
        <button
          onClick={toggleMode}
          className="p-1.5 w-8 flex items-center justify-center rounded-lg transition-colors"
          style={mode === 'speed' ? { backgroundColor: 'var(--reader-accent)', color: '#fff' } : { color: 'var(--text-muted)' }}
          title={mode === 'ebook' ? 'Switch to Speed Reader' : 'Switch to Ebook Reader'}
        >
          <FontAwesomeIcon icon={mode === 'ebook' ? faBolt : faBook} />
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="p-1.5 w-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Settings"
        >
          <FontAwesomeIcon icon={faGear} />
        </button>
      </div>
    </div>
  )
}
