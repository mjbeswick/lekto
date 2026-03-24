import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faBookmark } from '@fortawesome/free-solid-svg-icons'
import type { Bookmark } from '../../types'

interface Props {
  bookmarks: Bookmark[]
  onNavigate: (position: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function BookmarksPanel({ bookmarks, onNavigate, onDelete, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black bg-opacity-40" onClick={onClose} />
      <div className="w-72 h-full overflow-y-auto shadow-2xl flex flex-col" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
        <div className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold">Bookmarks</h2>
          <button onClick={onClose} className="p-1 transition-opacity active:opacity-50" style={{ color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={faXmark} size="lg" />
          </button>
        </div>

        {bookmarks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={faBookmark} size="2x" />
            <p className="text-sm">No bookmarks yet.<br />Tap the bookmark icon to save your place.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
            {[...bookmarks].reverse().map(b => (
              <button
                key={b.id}
                className="w-full text-left px-4 py-3 flex items-start gap-3 transition-opacity active:opacity-60 group"
                onClick={() => { onNavigate(b.position); onClose() }}
              >
                <FontAwesomeIcon icon={faBookmark} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--reader-accent)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{b.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(b.createdAt)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(b.id) }}
                  className="p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
