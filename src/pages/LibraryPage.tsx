import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faBook, faBookOpen, faClock, faEllipsisV, faFolderOpen, faGear, faList, faMinus, faPlus, faTableCells, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import { v4 as uuidv4 } from 'uuid'
import HeaderIconButton from '../components/HeaderIconButton'
import CollectionDrawer from '../components/BookcaseDrawer'
import FileTypeIcon from '../components/FileTypeIcon'
import { getProgress } from '../db/progress'
import { useAppStore } from '../store/appStore'
import { useCollectionStore } from '../store/bookcaseStore'
import { useLibraryStore } from '../store/libraryStore'
import type { Book, BookFormat } from '../types'
import { parseDocxMeta } from '../utils/docxParser'
import { parseEpubMeta } from '../utils/epubParser'
import { parseFb2Meta } from '../utils/fb2Parser'
import { b64ToBuffer, isWeb, readFileAsArrayBuffer, storeWebFile, webFilePath } from '../utils/fileStore'
import { parseMdMeta } from '../utils/markdownMeta'
import { parsePdfMeta } from '../utils/pdfParser'

const SUPPORTED = ['md', 'epub', 'txt', 'pdf', 'docx', 'fb2']
const ACCENT_COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#06b6d4', '#ec4899']

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

function progressLabel(progress: number): string {
  if (progress >= 1) return 'Finished'
  if (progress <= 0) return 'Not started'
  return `${Math.floor(progress * 100)}% complete`
}

async function buildBook(id: string, name: string, ext: BookFormat, data: ArrayBuffer, filePath: string): Promise<Book> {
  let title = name.replace(/\.[^.]+$/, '')
  let author = ''
  let coverUri: string | undefined

  if (ext === 'epub') {
    try { const meta = await parseEpubMeta(data); title = meta.title || title; author = meta.author; coverUri = meta.coverBase64 } catch { /* ignore unreadable metadata */ }
  } else if (ext === 'pdf') {
    try { const meta = await parsePdfMeta(data); title = meta.title || title; author = meta.author; coverUri = meta.coverBase64 } catch { /* ignore unreadable metadata */ }
  } else if (ext === 'docx') {
    try { const meta = await parseDocxMeta(data); title = meta.title || title; author = meta.author } catch { /* ignore unreadable metadata */ }
  } else if (ext === 'fb2') {
    try { const meta = await parseFb2Meta(data); title = meta.title || title; author = meta.author; coverUri = meta.coverBase64 } catch { /* ignore unreadable metadata */ }
  } else {
    try { const meta = parseMdMeta(new TextDecoder('utf-8').decode(data)); title = meta.title || title; author = meta.author } catch { /* ignore unreadable metadata */ }
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

  useEffect(() => {
    if (menuOpenId === null) return

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node
      setMenuOpenId(null)
      e.stopPropagation()
      void target
    }

    document.addEventListener('mousedown', handleMouseDown, true)
    return () => document.removeEventListener('mousedown', handleMouseDown, true)
  }, [menuOpenId])

  useEffect(() => {
    if (!books.length) return
    Promise.all(
      books.map(async book => {
        const progress = await getProgress(book.id)
        return [book.id, progress?.percent ?? 0] as [string, number]
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
          // Keep the fallback file tile when embedded cover extraction fails.
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

  const visibleBooks = selectedId === null ? books : books.filter(book => book.collectionId === selectedId)
  const collectionName = selectedId === null
    ? 'My Books'
    : (collections.find(collection => collection.id === selectedId)?.name ?? 'My Books')

  const sortedVisibleBooks = [...visibleBooks].sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
  const continueBook = sortedVisibleBooks.find(book => {
    const progress = progressMap[book.id] ?? 0
    return progress > 0 && progress < 1
  }) ?? sortedVisibleBooks[0]
  const inProgressCount = visibleBooks.filter(book => {
    const progress = progressMap[book.id] ?? 0
    return progress > 0 && progress < 1
  }).length
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
      } catch (e) {
        console.error('web file open error', e)
      }
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
    } catch (e) {
      console.error('native open error', e)
    }
    setImporting(false)
  }

  function handleOpen() {
    if (isWeb()) fileInputRef.current?.click()
    else void handleNativeOpen()
  }

  function renderBookMenu(book: Book) {
    return (
      <div
        className="absolute right-0 top-full mt-2 z-10 min-w-[180px] overflow-hidden rounded-2xl border"
        style={{
          backgroundColor: 'var(--reader-bg)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-soft)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {collections.map(collection => (
          <button
            key={collection.id}
            onClick={() => { updateBook(book.id, { collectionId: collection.id }); setMenuOpenId(null) }}
            className="flex w-full items-center gap-2 border-b px-4 py-3 text-left text-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <FontAwesomeIcon icon={faBookOpen} className="text-xs" style={{ color: 'var(--text-muted)' }} />
            {collection.name}
          </button>
        ))}
        {book.collectionId && (
          <button
            onClick={() => { updateBook(book.id, { collectionId: undefined }); setMenuOpenId(null) }}
            className="flex w-full items-center gap-2 border-b px-4 py-3 text-left text-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <FontAwesomeIcon icon={faMinus} className="text-xs" style={{ color: 'var(--text-muted)' }} />
            Remove from collection
          </button>
        )}
        <button
          onClick={() => { removeBook(book.id); setMenuOpenId(null) }}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm"
          style={{ color: '#ef4444' }}
        >
          <FontAwesomeIcon icon={faTrash} className="text-xs" />
          Delete book
        </button>
      </div>
    )
  }

  return (
    <>
      <CollectionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div
        className="h-full overflow-hidden"
        style={{
          backgroundColor: 'var(--reader-bg)',
          color: 'var(--reader-fg)',
          backgroundImage: [
            'radial-gradient(circle at 8% 0%, rgba(249, 115, 22, 0.14), transparent 24%)',
            'radial-gradient(circle at 90% 12%, rgba(59, 130, 246, 0.12), transparent 22%)',
            'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))',
          ].join(', '),
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.epub,.txt,.pdf,.docx,.fb2,.fb2.zip"
          multiple
          className="hidden"
          onChange={e => handleWebFile(e.target.files)}
        />

        <div className="h-full overflow-y-auto pb-[calc(1.5rem+var(--safe-bottom))]">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-[var(--app-gutter)] pb-8 pt-[calc(0.65rem+var(--safe-top))]">
            <section
              className="overflow-hidden rounded-[24px] border px-4 py-3.5 sm:px-5 sm:py-4"
              style={{
                background: 'linear-gradient(135deg, var(--library-hero-from), var(--library-hero-to))',
                borderColor: 'var(--library-border-soft)',
                boxShadow: 'var(--shadow-soft)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <HeaderIconButton onClick={() => setDrawerOpen(true)} title="Collections" aria-label="Manage collections">
                    <FontAwesomeIcon icon={faBars} />
                  </HeaderIconButton>
                  <div className="min-w-0 pt-0.5">
                    {books.length === 0 && (
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
                        Library
                      </p>
                    )}
                    <h1 className="truncate text-[clamp(1.3rem,2.8vw,2rem)] leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                      {collectionName}
                    </h1>
                    {books.length === 0 ? (
                      <p className="mt-1.5 max-w-xl text-[13px] leading-5 sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                        Bring your reading stack into one calm, focused space built for long-form reading.
                      </p>
                    ) : (
                      <p className="mt-1 text-[12px] sm:text-[13px]" style={{ color: 'var(--text-muted)' }}>
                        {selectedId === null
                          ? `${visibleBooks.length} books${inProgressCount ? `, ${inProgressCount} in progress` : ''}`
                          : `${visibleBooks.length} books in this collection`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isWeb() && (
                    <HeaderIconButton onClick={() => navigate('/browse')} title="Browse files" aria-label="Browse files">
                      <FontAwesomeIcon icon={faFolderOpen} />
                    </HeaderIconButton>
                  )}
                  <HeaderIconButton onClick={() => navigate('/settings')} title="Settings" aria-label="Settings">
                    <FontAwesomeIcon icon={faGear} />
                  </HeaderIconButton>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleOpen}
                  disabled={importing}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-60 sm:text-sm"
                  style={{ backgroundColor: 'var(--reader-accent)', boxShadow: 'var(--shadow-soft)' }}
                >
                  {importing ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FontAwesomeIcon icon={faPlus} />}
                  {books.length === 0 ? 'Import your first book' : 'Add more books'}
                </button>

                {continueBook && books.length > 0 && (
                  <button
                    onClick={() => navigate(`/reader/${continueBook.id}`)}
                    className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-[13px] font-semibold transition-colors active:opacity-70 sm:text-sm"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--reader-fg)' }}
                  >
                    <FontAwesomeIcon icon={faClock} />
                    Continue reading
                  </button>
                )}
              </div>

              {books.length === 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                  <div
                    className="rounded-[24px] border p-4 sm:p-5"
                    style={{ backgroundColor: 'var(--library-surface-2)', borderColor: 'var(--library-border-strong)' }}
                  >
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[22px] text-xl" style={{ backgroundColor: 'rgba(249, 115, 22, 0.12)', color: 'var(--reader-accent)' }}>
                      <FontAwesomeIcon icon={faBook} />
                    </div>
                    <h2 className="text-lg sm:text-xl" style={{ fontFamily: 'var(--font-display)' }}>
                      Start with the file you actually want to finish.
                    </h2>
                    <p className="mt-2 max-w-xl text-[13px] leading-5 sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                      The home screen now favors fewer decisions: import, jump back into recent reading, and keep your library visually organized instead of buried in a flat list.
                    </p>
                  </div>

                  <div
                    className="rounded-[24px] border p-4 sm:p-5"
                    style={{ backgroundColor: 'var(--library-surface-1)', borderColor: 'var(--library-border-soft)' }}
                  >
                    <p className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                      Supported formats
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['EPUB', 'PDF', 'DOCX', 'FB2', 'Markdown', 'TXT'].map(format => (
                        <span
                          key={format}
                          className="rounded-full border px-2.5 py-1 text-[12px]"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--library-surface-3)' }}
                        >
                          {format}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            {loading ? (
              <section
                className="flex min-h-[280px] items-center justify-center rounded-[32px] border"
                style={{ backgroundColor: 'var(--library-surface-1)', borderColor: 'var(--library-border-soft)', boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  <span className="text-sm">Loading library…</span>
                </div>
              </section>
            ) : books.length === 0 ? null : visibleBooks.length === 0 ? (
              <section
                className="rounded-[32px] border px-6 py-10 text-center"
                style={{ backgroundColor: 'var(--library-surface-1)', borderColor: 'var(--library-border-soft)', boxShadow: 'var(--shadow-card)' }}
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] text-4xl" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}>
                  <FontAwesomeIcon icon={faBook} />
                </div>
                <p className="mt-5 text-xl" style={{ fontFamily: 'var(--font-display)' }}>No books in this collection</p>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Import another file or move books here from the library menu.</p>
              </section>
            ) : (
              <section
                className="rounded-[28px] border p-3.5 sm:p-4"
                style={{ backgroundColor: 'var(--library-surface-1)', borderColor: 'var(--library-border-soft)', boxShadow: 'var(--shadow-soft)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
                  <div>
                    <p className="text-[12px] font-medium sm:text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      {visibleBooks.length} {visibleBooks.length === 1 ? 'book' : 'books'}
                    </p>
                  </div>

                  <div className="inline-flex rounded-2xl border p-1" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--library-surface-3)' }}>
                    <button
                      onClick={() => setLibraryView('list')}
                      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-semibold sm:text-sm"
                      style={libraryView === 'list'
                        ? { backgroundColor: 'var(--reader-fg)', color: 'var(--reader-bg)' }
                        : { color: 'var(--text-muted)' }}
                    >
                      <FontAwesomeIcon icon={faList} />
                      List
                    </button>
                    <button
                      onClick={() => setLibraryView('grid')}
                      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-semibold sm:text-sm"
                      style={libraryView === 'grid'
                        ? { backgroundColor: 'var(--reader-fg)', color: 'var(--reader-bg)' }
                        : { color: 'var(--text-muted)' }}
                    >
                      <FontAwesomeIcon icon={faTableCells} />
                      Grid
                    </button>
                  </div>
                </div>

                {libraryView === 'grid' ? (
                  <div className="grid grid-cols-2 gap-3 pt-1.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                    {sortedVisibleBooks.map(book => {
                      const hasCover = Boolean(book.coverUri)
                      const progress = progressMap[book.id] ?? 0
                      const color = titleColor(book.title)

                      return (
                        <article key={book.id} className="relative">
                          <button
                            onClick={() => navigate(`/reader/${book.id}`)}
                            className="group relative block w-full overflow-hidden rounded-[14px] border text-left"
                            style={{
                              aspectRatio: '2 / 3',
                              backgroundColor: hasCover ? 'var(--library-surface-5)' : `${color}12`,
                              borderColor: hasCover ? 'rgba(15, 23, 42, 0.08)' : `${color}30`,
                              boxShadow: '0 12px 22px rgba(15, 23, 42, 0.12), 0 1px 0 rgba(255, 255, 255, 0.4) inset',
                            }}
                          >
                            <div
                              className="absolute inset-y-0 left-0 z-[1] w-[8px]"
                              style={{
                                background: hasCover
                                  ? 'linear-gradient(180deg, rgba(255,255,255,0.24), rgba(15,23,42,0.12))'
                                  : `linear-gradient(180deg, ${color}55, ${color}18)`,
                                boxShadow: '1px 0 0 rgba(255,255,255,0.18) inset',
                              }}
                            />
                            <div className="relative h-full w-full">
                              {hasCover ? (
                                <img src={book.coverUri} alt={book.title} className="h-full w-full object-cover" />
                              ) : (
                                <div
                                  className="relative flex h-full w-full flex-col overflow-hidden"
                                  style={{
                                    backgroundColor: `${color}14`,
                                  }}
                                >
                                  <div className="absolute inset-0 opacity-70" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.36), rgba(255,255,255,0.04) 38%, rgba(15,23,42,0.18) 100%)' }} />
                                  <div
                                    className="relative mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-[18px] border text-[2.1rem] sm:h-[4.25rem] sm:w-[4.25rem] sm:text-[2.35rem]"
                                    style={{
                                      color,
                                      backgroundColor: 'rgba(255,255,255,0.32)',
                                      borderColor: `${color}30`,
                                      boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
                                    }}
                                  >
                                    <FileTypeIcon format={book.format} className="text-[2.1rem] sm:text-[2.35rem]" title={`${book.format.toUpperCase()} cover icon`} />
                                  </div>
                                  <div className="relative mt-6 px-5 text-center">
                                    <p className="line-clamp-3 text-[14px] font-semibold leading-snug sm:text-[15px]" style={{ color: 'rgba(20, 18, 14, 0.92)' }}>{book.title}</p>
                                    <p className="mt-2 truncate text-[11px] sm:text-[12px]" style={{ color: 'rgba(20, 18, 14, 0.6)' }}>{book.author || 'Unknown author'}</p>
                                  </div>
                                </div>
                              )}

                              <div
                                className="absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-3 text-white"
                                style={{
                                  backgroundColor: hasCover ? 'rgba(15, 23, 42, 0.84)' : 'rgba(15, 23, 42, 0.78)',
                                  backdropFilter: hasCover ? 'blur(10px)' : undefined,
                                  borderTop: hasCover ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.06)',
                                }}
                              >
                                {hasCover && <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white sm:text-[14px]">{book.title}</p>}
                                {hasCover && <p className="mt-1 truncate text-[10px] text-white/72 sm:text-[11px]">{book.author || 'Unknown author'}</p>}
                                <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-medium uppercase tracking-[0.1em] text-white/80 sm:text-[10px]">
                                  <span>{book.format.toUpperCase()}</span>
                                  <span>{progressLabel(progress)}</span>
                                </div>
                                <p className="mt-1 text-[10px] text-white/62 sm:text-[11px]">
                                  {book.lastOpenedAt ? `Opened ${relativeDate(book.lastOpenedAt)}` : `Added ${relativeDate(book.addedAt)}`}
                                </p>
                              </div>

                              {progress > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                                  <div className="h-1 transition-[width]" style={{ width: `${progress * 100}%`, backgroundColor: color }} />
                                </div>
                              )}
                            </div>
                          </button>

                          <div className="absolute right-1.5 top-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === book.id ? null : book.id) }}
                              className="flex h-6.5 w-6.5 items-center justify-center rounded-lg text-[10px] text-white transition-opacity active:opacity-60 sm:h-7 sm:w-7 sm:text-[11px]"
                              style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(10px)' }}
                            >
                              <FontAwesomeIcon icon={faEllipsisV} />
                            </button>
                            {menuOpenId === book.id && renderBookMenu(book)}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="grid gap-3 pt-2">
                    {sortedVisibleBooks.map(book => {
                      const progress = progressMap[book.id] ?? 0
                      const color = titleColor(book.title)

                      return (
                        <article
                          key={book.id}
                          className="flex items-center gap-3 rounded-[26px] border px-3 py-3 sm:gap-4 sm:px-4"
                          style={{ backgroundColor: 'var(--library-surface-4)', borderColor: 'var(--library-border-strong)' }}
                        >
                          <button
                            onClick={() => navigate(`/reader/${book.id}`)}
                            className="flex w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-[18px] border sm:w-16"
                            style={{ aspectRatio: '2 / 3', backgroundColor: book.coverUri ? undefined : `${color}1f`, borderColor: `${color}3d` }}
                          >
                            {book.coverUri ? (
                              <img src={book.coverUri} alt={book.title} className="h-full w-full object-cover" />
                            ) : (
                              <FileTypeIcon format={book.format} className="text-[2rem]" title={`${book.format.toUpperCase()} cover icon`} />
                            )}
                          </button>

                          <button onClick={() => navigate(`/reader/${book.id}`)} className="min-w-0 flex-1 text-left">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <p className="truncate text-sm font-semibold sm:text-[15px]">{book.title}</p>
                              <span className="rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ backgroundColor: `${color}1a`, color }}>
                                {book.format}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                              {book.author || 'Unknown author'}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                              <span>{progressLabel(progress)}</span>
                              <span>{book.lastOpenedAt ? `Opened ${relativeDate(book.lastOpenedAt)}` : `Added ${relativeDate(book.addedAt)}`}</span>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--surface-2)' }}>
                              <div className="h-1.5 rounded-full transition-[width]" style={{ width: `${progress * 100}%`, backgroundColor: color }} />
                            </div>
                          </button>

                          <div className="relative flex-shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === book.id ? null : book.id) }}
                              className="flex h-10 w-10 items-center justify-center rounded-2xl transition-opacity active:opacity-60"
                              style={{ backgroundColor: 'var(--library-surface-5)', color: 'var(--text-muted)' }}
                            >
                              <FontAwesomeIcon icon={faEllipsisV} />
                            </button>
                            {menuOpenId === book.id && renderBookMenu(book)}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
