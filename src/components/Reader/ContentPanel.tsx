import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faBookmark, faPlus } from '@fortawesome/free-solid-svg-icons'
import type { TocItem } from './EpubReader'
import type { Bookmark } from '../../types'

interface Props {
  toc: TocItem[]
  bookmarks: Bookmark[]
  onSelectToc: (href: string) => void
  onNavigateBookmark: (position: string) => void
  onAddBookmark: () => void
  onDeleteBookmark: (id: string) => void
  onClose: () => void
  initialTab?: 'contents' | 'bookmarks'
}

function TocNode({ item, onSelect }: { item: TocItem; onSelect: (href: string) => void }) {
  return (
    <li>
      <button
        className="w-full text-left py-3 px-4 border-b text-sm active:opacity-60"
        style={{ borderColor: 'var(--border)' }}
        onClick={() => onSelect(item.href)}
      >
        {item.label}
      </button>
      {item.subitems?.length ? (
        <ul className="pl-4">
          {item.subitems.map(sub => (
            <TocNode key={sub.id} item={sub} onSelect={onSelect} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ContentPanel({
  toc,
  bookmarks,
  onSelectToc,
  onNavigateBookmark,
  onAddBookmark,
  onDeleteBookmark,
  onClose,
  initialTab = 'contents',
}: Props) {
  const [activeTab, setActiveTab] = useState<'contents' | 'bookmarks'>(
    toc.length === 0 ? 'bookmarks' : initialTab,
  )
  const deleteButtonClassName = 'p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0'

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black bg-opacity-40" onClick={onClose} />
      <div
        className="h-full w-full max-w-[var(--panel-width)] flex flex-col shadow-2xl"
        style={{
          backgroundColor: 'var(--reader-bg)',
          color: 'var(--reader-fg)',
          paddingTop: 'var(--safe-top)',
          paddingBottom: 'var(--safe-bottom)',
          paddingRight: 'max(12px, var(--safe-right))',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Tabs */}
          <div className="flex gap-4">
            {toc.length > 0 && (
              <button
                className="text-sm font-semibold pb-0.5 transition-colors"
                style={
                  activeTab === 'contents'
                    ? { color: 'var(--reader-accent)', borderBottom: '2px solid var(--reader-accent)' }
                    : { color: 'var(--text-muted)', borderBottom: '2px solid transparent' }
                }
                onClick={() => setActiveTab('contents')}
              >
                Contents
              </button>
            )}
            <button
              className="text-sm font-semibold pb-0.5 transition-colors"
              style={
                activeTab === 'bookmarks'
                  ? { color: 'var(--reader-accent)', borderBottom: '2px solid var(--reader-accent)' }
                  : { color: 'var(--text-muted)', borderBottom: '2px solid transparent' }
              }
              onClick={() => setActiveTab('bookmarks')}
            >
              Bookmarks
            </button>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={faXmark} size="lg" />
          </button>
        </div>

        {/* Contents tab */}
        {activeTab === 'contents' && (
          <div className="flex-1 overflow-y-auto">
            {toc.length === 0 ? (
              <div
                className="flex-1 flex items-center justify-center p-6 text-sm text-center"
                style={{ color: 'var(--text-muted)' }}
              >
                No table of contents available.
              </div>
            ) : (
              <ul>
                {toc.map(item => (
                  <TocNode key={item.id} item={item} onSelect={href => { onSelectToc(href); onClose() }} />
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Bookmarks tab */}
        {activeTab === 'bookmarks' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Add bookmark button */}
            <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={onAddBookmark}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
                style={{ backgroundColor: 'var(--reader-accent)', color: '#fff' }}
              >
                <FontAwesomeIcon icon={faPlus} />
                Add Bookmark
              </button>
            </div>

            {/* Bookmark list */}
            {bookmarks.length === 0 ? (
              <div
                className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center"
                style={{ color: 'var(--text-muted)' }}
              >
                <FontAwesomeIcon icon={faBookmark} size="2x" />
                <p className="text-sm">No bookmarks yet.<br />Tap "Add Bookmark" to save your place.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
                {[...bookmarks].reverse().map(b => (
                  <button
                    key={b.id}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 transition-opacity active:opacity-60 group"
                    onClick={() => { onNavigateBookmark(b.position); onClose() }}
                  >
                    <FontAwesomeIcon
                      icon={faBookmark}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: 'var(--reader-accent)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{b.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(b.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteBookmark(b.id) }}
                      className={deleteButtonClassName}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
