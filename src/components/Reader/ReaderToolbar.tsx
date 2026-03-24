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
  const { mode, toggleMode } = useReaderModeStore()

  return (
    <div
      className="flex items-center justify-between gap-2 px-[var(--app-gutter)] pb-3 pt-3 flex-shrink-0 border-b"
      style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--border)', paddingTop: 'calc(0.75rem + var(--safe-top))' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <HeaderIconButton onClick={() => navigate('/library')} title="Back to library" aria-label="Back to library" className="w-11 h-11 rounded-2xl sm:w-10 sm:h-10 sm:rounded-xl">
          <FontAwesomeIcon icon={faArrowLeft} />
        </HeaderIconButton>
        {onTogglePanel && mode === 'ebook' && (
          <HeaderIconButton onClick={onTogglePanel} title="Contents and bookmarks" aria-label="Contents and bookmarks" className="w-11 h-11 rounded-2xl sm:w-10 sm:h-10 sm:rounded-xl">
            <FontAwesomeIcon icon={faBars} />
          </HeaderIconButton>
        )}
      </div>

      <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
        <h1 className="max-w-full text-center text-base font-semibold leading-tight sm:text-sm truncate">{title}</h1>
      </div>

      <div className="flex gap-2 items-center">
        <HeaderIconButton
          onClick={toggleMode}
          className="w-11 h-11 rounded-2xl sm:w-10 sm:h-10 sm:rounded-xl"
          active={mode === 'speed'}
          title={mode === 'ebook' ? 'Switch to Speed Reader' : 'Switch to Ebook Reader'}
          aria-label={mode === 'ebook' ? 'Switch to Speed Reader' : 'Switch to Ebook Reader'}
        >
          <FontAwesomeIcon icon={mode === 'ebook' ? faBolt : faBook} />
        </HeaderIconButton>
        <HeaderIconButton
          onClick={() => navigate('/settings')}
          className="w-11 h-11 rounded-2xl sm:w-10 sm:h-10 sm:rounded-xl"
          title="Settings"
          aria-label="Settings"
        >
          <FontAwesomeIcon icon={faGear} />
        </HeaderIconButton>
      </div>
    </div>
  )
}
