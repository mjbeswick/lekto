import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faBook, faBookOpen, faEllipsisV, faFolder, faFolderOpen, faFolderPlus, faGear, faList, faMagnifyingGlass, faMinus, faPlus, faTableCells, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import { v4 as uuidv4 } from 'uuid'
import HeaderIconButton from '../components/HeaderIconButton'
import CollectionDrawer from '../components/BookcaseDrawer'
import { getProgress } from '../db/progress'
import { useAppStore } from '../store/appStore'
import { useCollectionStore } from '../store/bookcaseStore'
import { useDirectoryStore } from '../store/directoryStore'
import { useLibraryStore } from '../store/libraryStore'
import type { Book, BookFormat } from '../types'
import { parseDocxMeta } from '../utils/docxParser'
import { parseEpubMeta } from '../utils/epubParser'
import { parseFb2Meta } from '../utils/fb2Parser'
import { storeWebFile, webFilePath, b64ToBuffer, readFileAsArrayBuffer } from '../utils/fileStore'
import { isWeb, isElectrobun, isCapacitor } from '../platform'
import { rpcOpenFileDialog, rpcReadFile } from '../platform/electrobunRpc'
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

  return { id, title, author, filePath, format: ext, coverUri, addedAt: Date.now(), fileSize: data.byteLength }
}

export default function LibraryPage() {
  const navigate = useNavigate()
  const { books, loading, loadBooks, addBook, updateBook, removeBook } = useLibraryStore()
  const { collections, selectedId, loadCollections } = useCollectionStore()
  const { libraryView, setLibraryView } = useAppStore()
  const { directories, scanning: dirScanning, loadDirectories, addDirectory, refreshDirectory, removeDirectory } = useDirectoryStore()
  const [importing, setImporting] = useState(false)
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const enrichingBookIdsRef = useRef(new Set<string>())

  useEffect(() => { loadBooks() }, [loadBooks])
  useEffect(() => { loadCollections() }, [loadCollections])
  useEffect(() => { loadDirectories() }, [loadDirectories])

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
    ? 'All Books'
    : (collections.find(collection => collection.id === selectedId)?.name ?? 'All Books')

  const searchQuery = search.toLowerCase()
  const filteredBooks = searchQuery
    ? visibleBooks.filter(b => b.title.toLowerCase().includes(searchQuery) || b.author.toLowerCase().includes(searchQuery))
    : visibleBooks
  const sortedVisibleBooks = [...filteredBooks].sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
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

  async function handleElectrobunOpen() {
    setImporting(true)
    try {
      const { paths } = await rpcOpenFileDialog()
      for (const filePath of paths) {
        const name = filePath.split('/').pop() ?? filePath.split('\\').pop() ?? 'unknown'
        const lower = name.toLowerCase()
        const ext = (lower.endsWith('.fb2.zip') ? 'fb2' : lower.split('.').pop()) as BookFormat
        if (!SUPPORTED.includes(ext)) continue
        const { data } = await rpcReadFile(filePath)
        const buffer = b64ToBuffer(data)
        const id = uuidv4()
        await storeWebFile(id, buffer)
        const book = await buildBook(id, name, ext, buffer, webFilePath(id))
        await addBook({ ...book, collectionId: selectedId ?? undefined })
      }
    } catch (e) { console.error('electrobun file open error', e) }
    setImporting(false)
  }

  function handleOpen() {
    if (isElectrobun())   void handleElectrobunOpen()
    else if (isWeb())     fileInputRef.current?.click()
    else                  void handleNativeOpen()
  }

  async function handleAddFolder() {
    const result = await addDirectory(selectedId ?? undefined)
    if (!result) return
    for (const book of result.toAdd) await addBook(book)
  }

  async function handleRefreshDirectory(id: string) {
    const dirBooks = books.filter(b => b.directoryId === id)
    const result = await refreshDirectory(id, dirBooks)
    if (!result) return
    for (const book of result.toAdd) await addBook(book)
    for (const bookId of result.toRemoveIds) await removeBook(bookId)
  }

  async function handleRemoveDirectory(id: string) {
    const dirBooks = books.filter(b => b.directoryId === id)
    const dir = directories.find(d => d.id === id)
    const bookCount = dirBooks.length
    const msg = bookCount > 0
      ? `Remove "${dir?.name ?? 'this folder'}" and delete its ${bookCount} ${bookCount === 1 ? 'book' : 'books'}?`
      : `Remove "${dir?.name ?? 'this folder'}"?`
    if (!window.confirm(msg)) return
    try {
      const removedIds = await removeDirectory(id, dirBooks)
      for (const bookId of removedIds) await removeBook(bookId)
    } catch (e) {
      console.error('Failed to remove directory', e)
    }
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
        className="h-full overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--reader-bg)',
          color: 'var(--reader-fg)',
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

        <div
          className="border-b flex-shrink-0 px-[var(--app-gutter)] py-3 flex items-center justify-between gap-3 flex-wrap"
          style={{ backgroundColor: 'var(--reader-bg)', borderColor: 'var(--border)', paddingTop: 'calc(0.75rem + var(--safe-top))' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <HeaderIconButton onClick={() => setDrawerOpen(true)} title="Collections" aria-label="Manage collections">
              <FontAwesomeIcon icon={faBars} />
            </HeaderIconButton>
            <h1 className="max-w-full font-semibold truncate" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
              {collectionName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {isCapacitor() && (
              <HeaderIconButton onClick={() => navigate('/browse')} title="Browse files" aria-label="Browse files">
                <FontAwesomeIcon icon={faFolderOpen} />
              </HeaderIconButton>
            )}
            <HeaderIconButton onClick={() => navigate('/settings')} title="Settings" aria-label="Settings">
              <FontAwesomeIcon icon={faGear} />
            </HeaderIconButton>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(1.5rem+var(--safe-bottom))]">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-[var(--app-gutter)] pb-8 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpen}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-60 sm:text-sm"
                style={{ backgroundColor: 'var(--reader-accent)' }}
              >
                {importing ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FontAwesomeIcon icon={faPlus} />}
                {books.length === 0 ? 'Import your first book' : 'Add more books'}
              </button>

              <button
                onClick={() => void handleAddFolder()}
                disabled={dirScanning}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-opacity active:opacity-70 disabled:opacity-60 sm:text-sm"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--reader-fg)' }}
              >
                {dirScanning ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <FontAwesomeIcon icon={faFolderPlus} />}
                Add folder
              </button>


              {books.length > 0 && (
                <div className="ml-auto flex flex-nowrap items-center gap-4">
                  <p className="text-[12px] font-medium sm:text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLibraryView('list')}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-all active:opacity-60 sm:text-sm"
                      style={libraryView === 'list'
                        ? { backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--reader-fg)' }
                        : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    >
                      <FontAwesomeIcon icon={faList} />
                      List
                    </button>
                    <button
                      onClick={() => setLibraryView('grid')}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-all active:opacity-60 sm:text-sm"
                      style={libraryView === 'grid'
                        ? { backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--reader-fg)' }
                        : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    >
                      <FontAwesomeIcon icon={faTableCells} />
                      Grid
                    </button>
                  </div>
                </div>
              )}
            </div>

            {books.length > 0 && (
              <div className="relative">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="search"
                  placeholder="Search by title or author…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl py-2.5 pl-9 pr-9 text-[13px] outline-none sm:text-sm"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--reader-fg)' }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full transition-opacity active:opacity-60"
                    style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}
                    aria-label="Clear search"
                  >
                    <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                  </button>
                )}
              </div>
            )}

            {directories.length > 0 && (
              <section className="mt-2">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                  Folder sources
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {directories.map(dir => {
                    const dirBookCount = books.filter(b => b.directoryId === dir.id).length
                    return (
                      <div
                        key={dir.id}
                        className="flex items-center gap-3 rounded-xl border px-3 py-3"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-base"
                          style={{ backgroundColor: 'var(--surface-2)', color: 'var(--reader-accent)' }}
                        >
                          <FontAwesomeIcon icon={faFolder} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{dir.name}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {dirBookCount} {dirBookCount === 1 ? 'book' : 'books'} &middot; scanned {relativeDate(dir.lastScanned)}
                          </p>
                        </div>
                        <button
                          onClick={() => void handleRefreshDirectory(dir.id)}
                          disabled={dirScanning}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-opacity active:opacity-60 disabled:opacity-40"
                          style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}
                          title="Refresh directory"
                        >
                          {dirScanning
                            ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            : <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.1-3.45L10 6h5V1l-1.35 1.35z"/></svg>
                          }
                        </button>
                        <button
                          onClick={() => void handleRemoveDirectory(dir.id)}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-opacity active:opacity-60"
                          style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}
                          title="Remove folder source"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {books.length === 0 ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                <div
                  className="rounded-xl p-4 sm:p-5"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--reader-accent)' }}>
                    <FontAwesomeIcon icon={faBook} />
                  </div>
                  <h2 className="text-lg font-semibold sm:text-xl">
                    Start with the file you actually want to finish.
                  </h2>
                  <p className="mt-2 max-w-xl text-[13px] leading-5 sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                    Bring your reading stack into one calm, focused space built for long-form reading.
                  </p>
                </div>

                <div
                  className="rounded-xl p-4 sm:p-5"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <p className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                    Supported formats
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['EPUB', 'PDF', 'DOCX', 'FB2', 'Markdown', 'TXT'].map(format => (
                      <span
                        key={format}
                        className="rounded-full px-2.5 py-1 text-[12px]"
                        style={{ backgroundColor: 'var(--surface-2)' }}
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {loading ? (
              <section
                className="flex min-h-[280px] items-center justify-center rounded-xl"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  <span className="text-sm">Loading library…</span>
                </div>
              </section>
            ) : books.length === 0 ? null : visibleBooks.length === 0 ? (
              <section
                className="rounded-xl px-6 py-10 text-center"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl text-4xl" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  <FontAwesomeIcon icon={faBook} />
                </div>
                <p className="mt-5 text-xl font-semibold">No books in this collection</p>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Import another file or move books here from the library menu.</p>
              </section>
            ) : (
              <>
                {libraryView === 'grid' ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                    {sortedVisibleBooks.map(book => {
                      const hasCover = Boolean(book.coverUri)
                      const progress = progressMap[book.id] ?? 0
                      const color = titleColor(book.title)

                      return (
                        <article key={book.id} className="relative">
                          <button
                            onClick={() => navigate(`/reader/${book.id}`)}
                            className="group book-card block w-full text-left"
                          >
                            <div className="flex h-full w-full flex-col" style={{ aspectRatio: '2 / 3' }}>
                              <div className="book-cover-spine relative flex-1 overflow-hidden" style={{ backgroundColor: hasCover ? 'var(--surface-2)' : color }}>
                                {hasCover ? (
                                  <img src={book.coverUri} alt={book.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="relative z-[2] flex h-full items-center justify-center p-3 text-center">
                                    <p className="line-clamp-4 text-[12px] font-bold leading-tight text-white">{book.title}</p>
                                  </div>
                                )}
                              </div>

                              <div className="min-h-[76px] border-t px-2.5 py-2 text-[10px] sm:text-[11px]"
                                style={{
                                  borderColor: 'var(--border)',
                                }}
                              >
                                <p className="truncate text-[10px] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                  {book.author || 'Unknown author'}
                                </p>
                                <div className="mt-1 flex items-center justify-between gap-2 text-[9px] font-medium uppercase tracking-[0.1em] sm:text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                  <span>{book.format.toUpperCase()}</span>
                                  <span>{progressLabel(progress)}</span>
                                </div>
                                <p className="mt-1 text-[10px] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                  {book.lastOpenedAt ? `Opened ${relativeDate(book.lastOpenedAt)}` : `Added ${relativeDate(book.addedAt)}`}
                                </p>
                              </div>

                              <div className="h-1 border-t" style={{ borderColor: 'var(--border)' }}>
                                <div className="h-1 transition-[width]" style={{ width: `${progress * 100}%`, backgroundColor: color }} />
                              </div>
                            </div>
                          </button>

                          <div className="absolute right-1.5 top-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === book.id ? null : book.id) }}
                              className="flex h-10 w-10 items-center justify-center rounded-lg transition-opacity active:opacity-60"
                              style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}
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
                  <div className="grid gap-3">
                    {sortedVisibleBooks.map(book => {
                      const progress = progressMap[book.id] ?? 0
                      const color = titleColor(book.title)

                      return (
                        <article
                          key={book.id}
                          className="flex items-center gap-3 rounded-xl border px-3 py-3 sm:gap-4 sm:px-4"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <button
                            onClick={() => navigate(`/reader/${book.id}`)}
                            className="book-card book-cover-spine relative flex w-14 flex-shrink-0 sm:w-16"
                            style={{ aspectRatio: '2 / 3', backgroundColor: book.coverUri ? 'var(--surface-2)' : color }}
                          >
                            {book.coverUri && (
                              <img src={book.coverUri} alt={book.title} className="h-full w-full object-cover" />
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
                            <p className="mt-2 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                              {`${Math.round(progress * 100)}%`}
                              {' · '}
                              {book.lastOpenedAt ? `Opened ${relativeDate(book.lastOpenedAt)}` : `Added ${relativeDate(book.addedAt)}`}
                              {book.fileSize != null && ` · ${Math.round(book.fileSize / 1024)} KB`}
                            </p>
                          </button>

                          <div className="relative flex-shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === book.id ? null : book.id) }}
                              className="flex h-10 w-10 items-center justify-center rounded-lg transition-opacity active:opacity-60"
                              style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}
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
              </>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
