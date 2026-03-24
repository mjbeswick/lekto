import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faBars, faBolt, faBook, faGear } from '@fortawesome/free-solid-svg-icons'
import { useReaderModeStore } from '../../hooks/useReaderMode'
import HeaderIconButton from '../HeaderIconButton'

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
        <HeaderIconButton onClick={() => navigate('/library')} title="Back to library" aria-label="Back to library" className="w-8 h-8 rounded-lg">
          <FontAwesomeIcon icon={faArrowLeft} />
        </HeaderIconButton>
        {onTogglePanel && mode === 'ebook' && (
          <HeaderIconButton onClick={onTogglePanel} title="Contents and bookmarks" aria-label="Contents and bookmarks" className="w-8 h-8 rounded-lg">
            <FontAwesomeIcon icon={faBars} />
          </HeaderIconButton>
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
        <HeaderIconButton
          onClick={toggleMode}
          className="w-8 h-8 rounded-lg"
          active={mode === 'speed'}
          title={mode === 'ebook' ? 'Switch to Speed Reader' : 'Switch to Ebook Reader'}
          aria-label={mode === 'ebook' ? 'Switch to Speed Reader' : 'Switch to Ebook Reader'}
        >
          <FontAwesomeIcon icon={mode === 'ebook' ? faBolt : faBook} />
        </HeaderIconButton>
        <HeaderIconButton
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-lg"
          title="Settings"
          aria-label="Settings"
        >
          <FontAwesomeIcon icon={faGear} />
        </HeaderIconButton>
      </div>
    </div>
  )
}
