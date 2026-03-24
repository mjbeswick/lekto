import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faFolderOpen, faTrash, faBook, faPlus, faBars, faEllipsisV, faBookOpen, faMinus, faList, faTableCells } from '@fortawesome/free-solid-svg-icons'
import { useLibraryStore } from '../store/libraryStore'
import { useCollectionStore } from '../store/bookcaseStore'
import { useAppStore } from '../store/appStore'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import type { Book, BookFormat } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { parseEpubMeta } from '../utils/epubParser'
import { parseMdMeta } from '../utils/markdownMeta'
import { parsePdfMeta } from '../utils/pdfParser'
import { parseDocxMeta } from '../utils/docxParser'
import { parseFb2Meta } from '../utils/fb2Parser'
import { isWeb, storeWebFile, webFilePath, b64ToBuffer, readFileAsArrayBuffer } from '../utils/fileStore'
import { getProgress } from '../db/progress'
import HeaderIconButton from '../components/HeaderIconButton'
import FileTypeIcon from '../components/FileTypeIcon'
import CollectionDrawer from '../components/BookcaseDrawer'

const SUPPORTED = ['md', 'epub', 'txt', 'pdf', 'docx', 'fb2']

// Deterministic accent colour per book title
const ACCENT_COLORS = ['#f97316','#3b82f6','#8b5cf6','#ef4444','#10b981','#f59e0b','#06b6d4','#ec4899']
function titleColor(title: string): string {
  let hash = 0
  for (const c of title) hash = (hash * 31 + c.charCodeAt(0)) & 0xfffffff
  return ACCENT_COLORS[hash % ACCENT_COLORS.length]
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

async function buildBook(id: string, name: string, ext: BookFormat, data: ArrayBuffer, filePath: string): Promise<Book> {
  let title = name.replace(/\.[^.]+$/, '')
  let author = ''
  let coverUri: string | undefined

  if (ext === 'epub') {
    try { const m = await parseEpubMeta(data); title = m.title || title; author = m.author; coverUri = m.coverBase64 } catch {}
  } else if (ext === 'pdf') {
    try { const m = await parsePdfMeta(data); title = m.title || title; author = m.author; coverUri = m.coverBase64 } catch {}
  } else if (ext === 'docx') {
    try { const m = await parseDocxMeta(data); title = m.title || title; author = m.author } catch {}
  } else if (ext === 'fb2') {
    try { const m = await parseFb2Meta(data); title = m.title || title; author = m.author; coverUri = m.coverBase64 } catch {}
  } else {
    try { const m = parseMdMeta(new TextDecoder('utf-8').decode(data)); title = m.title || title; author = m.author } catch {}
  }

  return { id, title, author, filePath, format: ext, coverUri, addedAt: Date.now() }
}

export default function LibraryPage() {
  const navigate = useNavigate()
  const { books, loading, loadBooks, addBook, updateBook, removeBook } = useLibraryStore()
  const { collections, selectedId, loadCollections } = useCollectionStore()
  const { libraryView, setLibraryView } = useAppStore()
  const [importing, setImporting] = useState(false)
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const enrichingBookIdsRef = useRef(new Set<string>())

  useEffect(() => { loadBooks() }, [loadBooks])
  useEffect(() => { loadCollections() }, [loadCollections])

  // Close context menu on outside click
  useEffect(() => {
    if (menuOpenId === null) return
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node
      // Close if click is outside any open menu; the menu buttons use stopPropagation
      setMenuOpenId(null)
      e.stopPropagation()
      // Don't prevent default so the click still works normally
      void target
    }
    document.addEventListener('mousedown', handleMouseDown, true)
    return () => document.removeEventListener('mousedown', handleMouseDown, true)
  }, [menuOpenId])

  // Load reading progress for all books
  useEffect(() => {
    if (!books.length) return
    Promise.all(
      books.map(async b => {
        const p = await getProgress(b.id)
        return [b.id, p?.percent ?? 0] as [string, number]
      })
    ).then(entries => setProgressMap(Object.fromEntries(entries)))
  }, [books])

  useEffect(() => {
    const booksNeedingCover = books.filter(book => {
      const supportsEmbeddedCover = book.format === 'epub' || book.format === 'pdf' || book.format === 'fb2'
      return supportsEmbeddedCover && !book.coverUri && !enrichingBookIdsRef.current.has(book.id)
    })
    if (!booksNeedingCover.length) return

    let cancelled = false

    const loadMissingCovers = async () => {
      for (const book of booksNeedingCover) {
        enrichingBookIdsRef.current.add(book.id)
        try {
          const data = await readFileAsArrayBuffer(book.filePath)
          const meta = book.format === 'epub'
            ? await parseEpubMeta(data)
            : book.format === 'pdf'
              ? await parsePdfMeta(data)
              : await parseFb2Meta(data)
          if (!cancelled && meta.coverBase64) {
            await updateBook(book.id, { coverUri: meta.coverBase64 })
          }
        } catch {
          // Ignore books whose metadata cannot be read; they will keep the fallback icon.
        } finally {
          enrichingBookIdsRef.current.delete(book.id)
        }
      }
    }

    void loadMissingCovers()

    return () => {
      cancelled = true
    }
  }, [books, updateBook])

  const visibleBooks = selectedId === null
    ? books
    : books.filter(b => b.collectionId === selectedId)

  async function handleWebFile(files: FileList | null) {
    if (!files?.length) return
    setImporting(true)
    for (const file of Array.from(files)) {
      const lower = file.name.toLowerCase()
      const ext = (lower.endsWith('.fb2.zip') ? 'fb2' : lower.split('.').pop()) as BookFormat
      if (!SUPPORTED.includes(ext)) continue
      try {
        const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as ArrayBuffer)
          reader.onerror = reject
          reader.readAsArrayBuffer(file)
        })
        const id = uuidv4()
        await storeWebFile(id, buffer)
        const book = await buildBook(id, file.name, ext, buffer, webFilePath(id))
        await addBook({ ...book, collectionId: selectedId ?? undefined })
      } catch (e) { console.error('web file open error', e) }
    }
    setImporting(false)
  }

  async function handleNativeOpen() {
    setImporting(true)
    try {
      const result = await FilePicker.pickFiles({ limit: 0, readData: true })
      for (const file of result.files) {
        if (!file.name || !file.data) continue
        const lower = file.name.toLowerCase()
        const ext = (lower.endsWith('.fb2.zip') ? 'fb2' : lower.split('.').pop()) as BookFormat
        if (!SUPPORTED.includes(ext)) continue
        const id = uuidv4()
        const filePath = file.path ?? webFilePath(id)
        const buffer = b64ToBuffer(file.data)
        await storeWebFile(id, buffer)
        const book = await buildBook(id, file.name, ext, buffer, filePath)
        await addBook({ ...book, collectionId: selectedId ?? undefined })
      }
    } catch (e) { console.error('native open error', e) }
    setImporting(false)
  }

  function handleOpen() {
    if (isWeb()) fileInputRef.current?.click()
    else handleNativeOpen()
  }

  return (
    <>
      <CollectionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
        <input ref={fileInputRef} type="file" accept=".md,.epub,.txt,.pdf,.docx,.fb2,.fb2.zip" multiple className="hidden"
          onChange={e => handleWebFile(e.target.files)} />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-[var(--app-gutter)] pb-4 flex-shrink-0 border-b" style={{ borderColor: 'var(--border)', paddingTop: 'calc(1rem + var(--safe-top))' }}>
          {/* Left: hamburger + title */}
          <div className="flex items-center gap-2 min-w-0 pt-1">
            <HeaderIconButton onClick={() => setDrawerOpen(true)} title="Collections" aria-label="Manage collections">
              <FontAwesomeIcon icon={faBars} />
            </HeaderIconButton>
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {selectedId === null ? 'My Books' : (collections.find(b => b.id === selectedId)?.name ?? 'My Books')}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!isWeb() && (
              <button onClick={() => navigate('/browse')}
                className="px-3 py-2.5 rounded-2xl text-sm font-semibold transition-opacity active:opacity-50 flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--reader-fg)' }}>
                <FontAwesomeIcon icon={faFolderOpen} />
                <span className="hidden sm:inline">Browse</span>
              </button>
            )}

            <HeaderIconButton onClick={() => setLibraryView(libraryView === 'list' ? 'grid' : 'list')} title={libraryView === 'list' ? 'Switch to grid view' : 'Switch to list view'} aria-label="Toggle view">
            <FontAwesomeIcon icon={libraryView === 'list' ? faTableCells : faList} />
          </HeaderIconButton>

          <HeaderIconButton onClick={handleOpen} disabled={importing} title="Open file" aria-label="Open file" className="disabled:opacity-50">
              {importing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faPlus} />
              )}
            </HeaderIconButton>

            <HeaderIconButton onClick={() => navigate('/settings')} title="Settings" aria-label="Settings">
              <FontAwesomeIcon icon={faGear} />
            </HeaderIconButton>
          </div>
        </div>

        {/* Book list */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading library…</span>
            </div>
          </div>
        ) : books.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 sm:px-10 text-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}>
              <FontAwesomeIcon icon={faBook} />
            </div>
            <div>
              <p className="text-lg font-semibold mb-1">Your library is empty</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tap <strong>+ Open</strong> to add an EPUB, PDF, DOCX, FB2, Markdown or TXT file</p>
            </div>
            <button onClick={handleOpen}
              className="bg-orange-500 text-white px-6 py-3 rounded-2xl text-sm font-semibold transition-opacity active:opacity-70">
              + Open a book
            </button>
          </div>
        ) : visibleBooks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 sm:px-10 text-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}>
              <FontAwesomeIcon icon={faBook} />
            </div>
            <div>
              <p className="text-lg font-semibold mb-1">No books in this collection</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add books by opening a file</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pb-8">
            {libraryView === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-[var(--app-gutter)] pt-4">
                {visibleBooks
                  .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
                  .map(book => {
                  const pct = progressMap[book.id] ?? 0
                  const color = titleColor(book.title)
                  return (
                    <div key={book.id} className="flex flex-col rounded-2xl overflow-hidden border transition-opacity active:opacity-70"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                      {/* Cover */}
                      <div className="relative cursor-pointer" style={{ aspectRatio: '2/3' }}
                        onClick={() => navigate(`/reader/${book.id}`)}>
                        {book.coverUri
                          ? <img src={book.coverUri} alt={book.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-4xl"
                              style={{ backgroundColor: color + '22' }}>
                              <FileTypeIcon format={book.format} className="text-[2.5rem]" title={`${book.format.toUpperCase()} cover icon`} />
                            </div>
                        }
                        {/* Progress bar overlay at bottom of cover */}
                        {pct > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                            <div className="h-1 transition-[width]" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                          </div>
                        )}
                        {/* Menu button */}
                        <div className="absolute top-1.5 right-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === book.id ? null : book.id) }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-opacity active:opacity-50"
                            style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#fff' }}>
                            <FontAwesomeIcon icon={faEllipsisV} />
                          </button>
                          {menuOpenId === book.id && (
                            <div
                              className="absolute right-0 top-full mt-1 z-10 rounded-xl shadow-lg overflow-hidden min-w-[160px] border"
                              style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--border)' }}
                              onClick={e => e.stopPropagation()}
                            >
                              {collections.map(bc => (
                                <button key={bc.id}
                                  onClick={() => { updateBook(book.id, { collectionId: bc.id }); setMenuOpenId(null) }}
                                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 border-b"
                                  style={{ borderColor: 'var(--border)' }}>
                                  <FontAwesomeIcon icon={faBookOpen} className="text-xs" style={{ color: 'var(--text-muted)' }} />
                                  {bc.name}
                                </button>
                              ))}
                              {book.collectionId && (
                                <button
                                  onClick={() => { updateBook(book.id, { collectionId: undefined }); setMenuOpenId(null) }}
                                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 border-b"
                                  style={{ borderColor: 'var(--border)' }}>
                                  <FontAwesomeIcon icon={faMinus} className="text-xs" style={{ color: 'var(--text-muted)' }} />
                                  Remove from collection
                                </button>
                              )}
                              <button
                                onClick={() => { removeBook(book.id); setMenuOpenId(null) }}
                                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2"
                                style={{ color: '#ef4444' }}>
                                <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                Delete book
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Title */}
                      <div className="px-2.5 py-2 cursor-pointer" onClick={() => navigate(`/reader/${book.id}`)}>
                        <p className="text-xs font-semibold leading-snug line-clamp-2">{book.title}</p>
                        {book.author && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{book.author}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              visibleBooks
                .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
                .map(book => {
                const pct = progressMap[book.id] ?? 0
                const color = titleColor(book.title)
                return (
                  <div key={book.id} className="flex items-center gap-3 px-[var(--app-gutter)] py-4 border-b transition-colors sm:gap-4"
                    style={{ borderColor: 'var(--border)' }}>
                    {/* Cover */}
                    <div className="w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: book.coverUri ? undefined : color + '22', border: `1.5px solid ${color}33` }}>
                      {book.coverUri
                        ? <img src={book.coverUri} alt={book.title} className="w-full h-full object-cover" />
                        : <FileTypeIcon format={book.format} className="text-[2rem]" title={`${book.format.toUpperCase()} cover icon`} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/reader/${book.id}`)}>
                      <p className="font-semibold truncate text-sm leading-snug">{book.title}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {book.author || 'Unknown author'} · {relativeDate(book.addedAt)}
                      </p>
                      {pct >= 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {Math.floor(pct * 100)}% complete
                          </span>
                        </div>
                      )}
                      {/* Progress bar */}
                      {pct > 0 && (
                        <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-2)' }}>
                          <div className="h-0.5 rounded-full transition-[width]" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                        </div>
                      )}
                    </div>

                    {/* Context menu */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === book.id ? null : book.id) }}
                        className="p-2 rounded-xl transition-opacity active:opacity-50"
                        style={{ color: 'var(--text-muted)' }}>
                        <FontAwesomeIcon icon={faEllipsisV} />
                      </button>
                      {menuOpenId === book.id && (
                        <div
                          className="absolute right-0 top-full mt-1 z-10 rounded-xl shadow-lg overflow-hidden min-w-[160px] border"
                          style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--border)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          {collections.map(bc => (
                            <button key={bc.id}
                              onClick={() => { updateBook(book.id, { collectionId: bc.id }); setMenuOpenId(null) }}
                              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 border-b"
                              style={{ borderColor: 'var(--border)' }}>
                              <FontAwesomeIcon icon={faBookOpen} className="text-xs" style={{ color: 'var(--text-muted)' }} />
                              {bc.name}
                            </button>
                          ))}
                          {book.collectionId && (
                            <button
                              onClick={() => { updateBook(book.id, { collectionId: undefined }); setMenuOpenId(null) }}
                              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 border-b"
                              style={{ borderColor: 'var(--border)' }}>
                              <FontAwesomeIcon icon={faMinus} className="text-xs" style={{ color: 'var(--text-muted)' }} />
                              Remove from collection
                            </button>
                          )}
                          <button
                            onClick={() => { removeBook(book.id); setMenuOpenId(null) }}
                            className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2"
                            style={{ color: '#ef4444' }}>
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                            Delete book
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </>
  )
}
