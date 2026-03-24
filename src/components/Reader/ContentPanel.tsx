import { useState, useMemo, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faBookmark, faPlus, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import type { TocItem } from './EpubReader'
import type { Bookmark } from '../../types'

interface SearchResult {
  offset: number
  before: string
  match: string
  after: string
}

function searchInText(text: string, query: string): SearchResult[] {
  const q = query.trim()
  if (q.length < 2) return []
  const lower = text.toLowerCase()
  const lq = q.toLowerCase()
  const CONTEXT = 70
  const results: SearchResult[] = []
  let idx = 0
  while (results.length < 100) {
    const pos = lower.indexOf(lq, idx)
    if (pos === -1) break
    const start = Math.max(0, pos - CONTEXT)
    const end = Math.min(text.length, pos + lq.length + CONTEXT)
    results.push({
      offset: pos,
      before: (start > 0 ? '…' : '') + text.slice(start, pos),
      match: text.slice(pos, pos + lq.length),
      after: text.slice(pos + lq.length, end) + (end < text.length ? '…' : ''),
    })
    idx = pos + 1
  }
  return results
}

interface Props {
  open: boolean
  toc: TocItem[]
  bookmarks: Bookmark[]
  searchText?: string
  currentHref?: string
  onSelectToc: (href: string) => void
  onNavigateBookmark: (position: string) => void
  onAddBookmark: () => void
  onDeleteBookmark: (id: string) => void
  onSearchResultSelect?: (offset: number) => void
  onClose: () => void
  initialTab?: 'contents' | 'bookmarks' | 'search'
}

function TocNode({ item, onSelect, currentHref }: { item: TocItem; onSelect: (href: string) => void; currentHref?: string }) {
  const isActive = !!currentHref && item.href.split('#')[0] === currentHref.split('#')[0]
  return (
    <li>
      <button
        className="w-full text-left py-3 px-4 border-b text-sm active:opacity-60"
        style={{
          borderColor: 'var(--border)',
          ...(isActive ? { color: 'var(--reader-accent)', fontWeight: 600 } : {}),
        }}
        data-active={isActive || undefined}
        onClick={() => onSelect(item.href)}
      >
        {item.label}
      </button>
      {item.subitems?.length ? (
        <ul className="pl-4">
          {item.subitems.map(sub => (
            <TocNode key={sub.id} item={sub} onSelect={onSelect} currentHref={currentHref} />
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
  open,
  toc,
  bookmarks,
  searchText,
  currentHref,
  onSelectToc,
  onNavigateBookmark,
  onAddBookmark,
  onDeleteBookmark,
  onSearchResultSelect,
  onClose,
  initialTab = 'contents',
}: Props) {
  const [activeTab, setActiveTab] = useState<'contents' | 'bookmarks' | 'search'>(
    initialTab === 'contents' && toc.length === 0 ? 'bookmarks' : initialTab,
  )
  const [query, setQuery] = useState('')
  const tocContainerRef = useRef<HTMLDivElement>(null)

  // Scroll the active TOC item into view when the contents tab is shown
  useEffect(() => {
    if (activeTab !== 'contents') return
    const container = tocContainerRef.current
    if (!container) return
    requestAnimationFrame(() => {
      const active = container.querySelector('[data-active]') as HTMLElement | null
      active?.scrollIntoView({ block: 'center' })
    })
  }, [activeTab, currentHref])

  const deleteButtonClassName = 'w-8 h-8 rounded-xl flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0'

  const searchResults = useMemo(() => {
    if (!searchText) return []
    return searchInText(searchText, query)
  }, [searchText, query])

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — slides in from left */}
      <div
        className={`fixed top-0 left-0 h-full z-50 w-full max-w-[var(--panel-width)] flex flex-col shadow-2xl transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          backgroundColor: 'var(--reader-bg)',
          color: 'var(--reader-fg)',
          borderRight: '1px solid var(--border)',
          paddingLeft: 'max(0px, var(--safe-left, 0px))',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 flex-shrink-0 border-b"
          style={{ borderColor: 'var(--border)', paddingTop: 'calc(1rem + var(--safe-top))', paddingBottom: '1rem' }}
        >
          {/* Tabs */}
          <div className="flex gap-5">
            {toc.length > 0 && (
              <button
                className="text-sm font-semibold pb-1 transition-colors"
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
              className="text-sm font-semibold pb-1 transition-colors"
              style={
                activeTab === 'bookmarks'
                  ? { color: 'var(--reader-accent)', borderBottom: '2px solid var(--reader-accent)' }
                  : { color: 'var(--text-muted)', borderBottom: '2px solid transparent' }
              }
              onClick={() => setActiveTab('bookmarks')}
            >
              Bookmarks
            </button>
            <button
              className="text-sm font-semibold pb-1 transition-colors"
              style={
                activeTab === 'search'
                  ? { color: 'var(--reader-accent)', borderBottom: '2px solid var(--reader-accent)' }
                  : { color: 'var(--text-muted)', borderBottom: '2px solid transparent' }
              }
              onClick={() => setActiveTab('search')}
            >
              Search
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-2xl flex items-center justify-center transition-opacity active:opacity-50 sm:w-10 sm:h-10 sm:rounded-xl"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}
            aria-label="Close panel"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Contents tab */}
        {activeTab === 'contents' && (
          <div ref={tocContainerRef} className="flex-1 overflow-y-auto">
            {toc.length === 0 ? (
              <div
                className="flex-1 flex items-center justify-center p-6 text-sm text-center"
                style={{ color: 'var(--text-muted)' }}
              >
                No table of contents available.
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {toc.map(item => (
                  <TocNode key={item.id} item={item} onSelect={href => { onSelectToc(href); onClose() }} currentHref={currentHref} />
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Bookmarks tab */}
        {activeTab === 'bookmarks' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Bookmark list */}
            {bookmarks.length === 0 ? (
              <div
                className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center"
                style={{ color: 'var(--text-muted)' }}
              >
                <FontAwesomeIcon icon={faBookmark} size="2x" />
                <p className="text-sm leading-6">No bookmarks yet.<br />Tap "Add Bookmark" below to save your place.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
                {[...bookmarks].reverse().map(b => (
                  <div
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    className="w-full text-left px-4 py-3.5 flex items-start gap-3 transition-opacity active:opacity-60 group cursor-pointer"
                    onClick={() => { onNavigateBookmark(b.position); onClose() }}
                    onKeyDown={e => { if (e.key === 'Enter') { onNavigateBookmark(b.position); onClose() } }}
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
                      aria-label={`Delete bookmark ${b.label}`}
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Footer: Add Bookmark */}
            <div
              className="flex-shrink-0 p-4 border-t"
              style={{ borderColor: 'var(--border)', paddingBottom: 'calc(1rem + var(--safe-bottom, 0px))' }}
            >
              <button
                onClick={onAddBookmark}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold transition-opacity active:opacity-70"
                style={{ backgroundColor: 'var(--reader-accent)', color: '#fff' }}
              >
                <FontAwesomeIcon icon={faPlus} />
                Add Bookmark
              </button>
            </div>
          </div>
        )}

        {/* Search tab */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2 border"
                style={{ borderColor: 'var(--border)' }}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} size="sm" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="search"
                  placeholder="Search in book…"
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--reader-fg)' }}
                />
              </div>
            </div>
            {!searchText ? (
              <div className="flex-1 flex items-center justify-center p-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                Search is not available for this format.
              </div>
            ) : query.trim().length < 2 ? (
              <div className="flex-1 flex items-center justify-center p-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                Type at least 2 characters to search…
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                No results found.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <p className="px-4 py-2 text-xs border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                  {searchResults.length === 100 ? '100+ results' : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
                </p>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-4 py-3.5 text-sm transition-opacity active:opacity-60"
                      onClick={() => { onSearchResultSelect?.(r.offset); onClose() }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>{r.before}</span>
                      <span style={{ color: 'var(--reader-accent)', fontWeight: 600 }}>{r.match}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{r.after}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
