import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faFolderOpen, faBookOpen, faFile, faTrash, faBook } from '@fortawesome/free-solid-svg-icons'
import { useLibraryStore } from '../store/libraryStore'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import type { Book, BookFormat } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { parseEpubMeta } from '../utils/epubParser'
import { parseMdMeta } from '../utils/markdownMeta'
import { isWeb, storeWebFile, webFilePath } from '../utils/fileStore'
import { getProgress } from '../db/progress'

const SUPPORTED = ['md', 'epub', 'txt']

// Deterministic accent colour per book title
const ACCENT_COLORS = ['#f97316','#3b82f6','#8b5cf6','#ef4444','#10b981','#f59e0b','#06b6d4','#ec4899']
function titleColor(title: string): string {
  let hash = 0
  for (const c of title) hash = (hash * 31 + c.charCodeAt(0)) & 0xfffffff
  return ACCENT_COLORS[hash % ACCENT_COLORS.length]
}

function formatBadge(format: BookFormat) {
  const styles: Record<BookFormat, string> = {
    epub: 'bg-blue-100 text-blue-700',
    md:   'bg-green-100 text-green-700',
    txt:  'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${styles[format]}`}>
      {format.toUpperCase()}
    </span>
  )
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

function base64ToUtf8(b64: string): string {
  try {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new TextDecoder('utf-8').decode(bytes)
  } catch { return b64 }
}

async function buildBook(id: string, name: string, ext: BookFormat, base64: string, filePath: string): Promise<Book> {
  let title = name.replace(/\.[^.]+$/, '')
  let author = ''
  let coverUri: string | undefined

  if (ext === 'epub') {
    try { const m = await parseEpubMeta(base64); title = m.title || title; author = m.author; coverUri = m.coverBase64 } catch {}
  } else {
    try { const m = parseMdMeta(base64ToUtf8(base64)); title = m.title || title; author = m.author } catch {}
  }

  return { id, title, author, filePath, format: ext, coverUri, addedAt: Date.now() }
}

export default function LibraryPage() {
  const navigate = useNavigate()
  const { books, loading, loadBooks, addBook, removeBook } = useLibraryStore()
  const [importing, setImporting] = useState(false)
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadBooks() }, [loadBooks])

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

  async function handleWebFile(files: FileList | null) {
    if (!files?.length) return
    setImporting(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase() as BookFormat
      if (!SUPPORTED.includes(ext)) continue
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const id = uuidv4()
        await storeWebFile(id, base64)
        const book = await buildBook(id, file.name, ext, base64, webFilePath(id))
        await addBook(book)
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
        const ext = file.name.split('.').pop()?.toLowerCase() as BookFormat
        if (!SUPPORTED.includes(ext)) continue
        const id = uuidv4()
        const filePath = file.path ?? webFilePath(id)
        await storeWebFile(id, file.data)
        const book = await buildBook(id, file.name, ext, file.data, filePath)
        await addBook(book)
      }
    } catch (e) { console.error('native open error', e) }
    setImporting(false)
  }

  function handleOpen() {
    if (isWeb()) fileInputRef.current?.click()
    else handleNativeOpen()
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
      <input ref={fileInputRef} type="file" accept=".md,.epub,.txt" multiple className="hidden"
        onChange={e => handleWebFile(e.target.files)} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-4 flex-shrink-0 border-b" style={{ borderColor: 'var(--border)', paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        <h1 className="text-2xl font-bold tracking-tight">Lekto</h1>
        <div className="flex gap-2 items-center">
          <button onClick={() => navigate('/settings')} className="p-1.5 rounded-xl transition-opacity active:opacity-50" style={{ color: 'var(--text-muted)' }} title="Settings">
            <FontAwesomeIcon icon={faGear} size="lg" />
          </button>
          {!isWeb() && (
            <button onClick={() => navigate('/browse')}
              className="px-3 py-2 rounded-xl text-sm font-semibold transition-opacity active:opacity-50 flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--reader-fg)' }}>
              <FontAwesomeIcon icon={faFolderOpen} />
              Browse
            </button>
          )}
          <button onClick={handleOpen} disabled={importing}
            className="bg-orange-500 text-white px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity active:opacity-70">
            {importing ? '…' : '+ Open'}
          </button>
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
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-10 text-center">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={faBook} />
          </div>
          <div>
            <p className="text-lg font-semibold mb-1">Your library is empty</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tap <strong>+ Open</strong> to add a Markdown, EPUB or TXT file</p>
          </div>
          <button onClick={handleOpen}
            className="bg-orange-500 text-white px-6 py-3 rounded-2xl text-sm font-semibold transition-opacity active:opacity-70">
            + Open a book
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-8">
          {books.map(book => {
            const pct = progressMap[book.id] ?? 0
            const color = titleColor(book.title)
            return (
              <div key={book.id} className="flex items-center gap-4 px-5 py-4 border-b transition-colors"
                style={{ borderColor: 'var(--border)' }}>
                {/* Cover */}
                <div className="w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: book.coverUri ? undefined : color + '22', border: `1.5px solid ${color}33` }}>
                  {book.coverUri
                    ? <img src={book.coverUri} alt={book.title} className="w-full h-full object-cover" />
                    : <FontAwesomeIcon icon={book.format === 'epub' ? faBookOpen : faFile} style={{ color }} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/reader/${book.id}`)}>
                  <p className="font-semibold truncate text-sm leading-snug">{book.title}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {book.author || 'Unknown author'} · {relativeDate(book.addedAt)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {formatBadge(book.format)}
                    {pct > 0 && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(pct * 100)}%</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  {pct > 0 && (
                    <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-2)' }}>
                      <div className="h-0.5 rounded-full transition-[width]" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                    </div>
                  )}
                </div>

                <button onClick={() => removeBook(book.id)}
                  className="p-2 rounded-xl transition-opacity active:opacity-50 flex-shrink-0"
                  style={{ color: 'var(--text-muted)' }}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
