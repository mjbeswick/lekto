import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faChevronRight, faDownload, faFolder, faFolderOpen, faPlus } from '@fortawesome/free-solid-svg-icons'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { parseEpubMeta } from '../utils/epubParser'
import { parseMdMeta } from '../utils/markdownMeta'
import { parsePdfMeta } from '../utils/pdfParser'
import { parseDocxMeta } from '../utils/docxParser'
import { parseFb2Meta } from '../utils/fb2Parser'
import { useLibraryStore } from '../store/libraryStore'
import type { Book, BookFormat } from '../types'
import { v4 as uuidv4 } from 'uuid'
import HeaderIconButton from '../components/HeaderIconButton'
import FileTypeIcon from '../components/FileTypeIcon'
import { useAppStore } from '../store/appStore'

interface FileEntry {
  name: string
  path: string
  uri: string
  isDir: boolean
}

interface FilePreview {
  coverUri?: string
}

interface BreadcrumbEntry {
  name: string
  path: string
  directory: Directory
}

const ROOT_DIRS: BreadcrumbEntry[] = [
  { name: 'Documents', path: '', directory: Directory.Documents },
  { name: 'Downloads', path: '', directory: Directory.External },
]
const BOOK_EXTS = ['.md', '.epub', '.txt', '.pdf', '.docx', '.fb2', '.fb2.zip']
const SUPPORTED = ['md', 'epub', 'txt', 'pdf', 'docx', 'fb2']

function getBookFormat(name: string): BookFormat {
  const lower = name.toLowerCase()
  return (lower.endsWith('.fb2.zip') ? 'fb2' : lower.split('.').pop()) as BookFormat
}

function b64ToArrayBuffer(b64: string) {
  const bin = atob(b64)
  const buf = new ArrayBuffer(bin.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i)
  return buf
}

async function parseBookMeta(ext: BookFormat, data: string, fallbackTitle: string) {
  let title = fallbackTitle
  let author = ''
  let coverUri: string | undefined

  if (ext === 'epub' && data) {
    try {
      const meta = await parseEpubMeta(data)
      title = meta.title || title
      author = meta.author
      coverUri = meta.coverBase64
    } catch (e) { console.warn('epub meta', e) }
  } else if (ext === 'md' && data) {
    try {
      const text = atob(data)
      const meta = parseMdMeta(text)
      title = meta.title || title
      author = meta.author
    } catch (e) { console.warn('md meta', e) }
  } else if (ext === 'pdf' && data) {
    try {
      const meta = await parsePdfMeta(b64ToArrayBuffer(data))
      title = meta.title || title
      author = meta.author
      coverUri = meta.coverBase64
    } catch (e) { console.warn('pdf meta', e) }
  } else if (ext === 'docx' && data) {
    try {
      const meta = await parseDocxMeta(b64ToArrayBuffer(data))
      title = meta.title || title
      author = meta.author
    } catch (e) { console.warn('docx meta', e) }
  } else if (ext === 'fb2' && data) {
    try {
      const meta = await parseFb2Meta(b64ToArrayBuffer(data))
      title = meta.title || title
      author = meta.author
      coverUri = meta.coverBase64
    } catch (e) { console.warn('fb2 meta', e) }
  }

  return { title, author, coverUri }
}

export default function FileBrowserPage() {
  const navigate = useNavigate()
  const { books, addBook } = useLibraryStore()
  const theme = useAppStore(s => s.theme)
  const headerBg = theme === 'light' ? '#ffffff' : 'var(--surface)'

  const [currentDir, setCurrentDir] = useState<Directory>(Directory.Documents)
  const [currentPath, setCurrentPath] = useState('')
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([ROOT_DIRS[0]])
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [previewMap, setPreviewMap] = useState<Record<string, FilePreview>>({})
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)
  const [importingFolder, setImportingFolder] = useState(false)
  const [folderNotice, setFolderNotice] = useState<string | null>(null)
  const [activeRoot, setActiveRoot] = useState<'Documents' | 'Downloads'>('Documents')

  async function listDir(path: string, directory: Directory) {
    setLoading(true)
    try {
      const result = await Filesystem.readdir({ path: path || '.', directory })
      const all = await Promise.all(
        result.files.map(async (f) => {
          const fullPath = path ? `${path}/${f.name}` : f.name
          return {
            name: f.name,
            path: fullPath,
            uri: f.uri ?? '',
            isDir: f.type === 'directory',
          } as FileEntry
        })
      )
      // Show dirs first, then supported book files
      const filtered = all.filter(f => f.isDir || BOOK_EXTS.some(ext => f.name.toLowerCase().endsWith(ext)))
      filtered.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1
        if (!a.isDir && b.isDir) return 1
        return a.name.localeCompare(b.name)
      })
      setEntries(filtered)
    } catch (e) {
      setEntries([])
      console.warn('readdir failed', e)
    }
    setLoading(false)
  }

  useEffect(() => {
    listDir(currentPath, currentDir)
  }, [currentPath, currentDir])

  useEffect(() => {
    let cancelled = false

    async function loadPreviews() {
      const files = entries.filter(entry => !entry.isDir)

      for (const entry of files) {
        if (cancelled || previewMap[entry.path]) continue

        const ext = getBookFormat(entry.name)
        if (ext !== 'epub' && ext !== 'pdf' && ext !== 'fb2') continue

        try {
          const file = await Filesystem.readFile({ path: entry.path, directory: currentDir })
          const data = typeof file.data === 'string' ? file.data : ''
          const meta = await parseBookMeta(ext, data, entry.name.replace(/\.[^.]+$/, ''))

          if (!cancelled && meta.coverUri) {
            setPreviewMap(prev => (prev[entry.path] ? prev : { ...prev, [entry.path]: { coverUri: meta.coverUri } }))
          }
        } catch (e) {
          console.warn('preview load failed', e)
        }
      }
    }

    void loadPreviews()

    return () => {
      cancelled = true
    }
  }, [currentDir, entries, previewMap])

  function enterDir(entry: FileEntry) {
    setFolderNotice(null)
    setBreadcrumbs(prev => [...prev, { name: entry.name, path: entry.path, directory: currentDir }])
    setCurrentPath(entry.path)
  }

  function navigateBreadcrumb(index: number) {
    const crumb = breadcrumbs[index]
    setFolderNotice(null)
    setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    setCurrentDir(crumb.directory)
    setCurrentPath(crumb.path)
  }

  function switchRoot(root: typeof ROOT_DIRS[0]) {
    setFolderNotice(null)
    setActiveRoot(root.name as 'Documents' | 'Downloads')
    setCurrentDir(root.directory)
    setCurrentPath('')
    setBreadcrumbs([root])
  }

  async function collectBooksFromDirectory(path: string, directory: Directory): Promise<FileEntry[]> {
    const result = await Filesystem.readdir({ path: path || '.', directory })
    const collected: FileEntry[] = []

    for (const file of result.files) {
      const fullPath = path ? `${path}/${file.name}` : file.name
      if (file.type === 'directory') {
        const nested = await collectBooksFromDirectory(fullPath, directory)
        collected.push(...nested)
        continue
      }
      if (!BOOK_EXTS.some(ext => file.name.toLowerCase().endsWith(ext))) continue
      collected.push({
        name: file.name,
        path: fullPath,
        uri: file.uri ?? '',
        isDir: false,
      })
    }

    return collected
  }

  async function importBookEntry(entry: FileEntry): Promise<Book> {
    const ext = getBookFormat(entry.name)
    const file = await Filesystem.readFile({ path: entry.path, directory: currentDir })
    const data = typeof file.data === 'string' ? file.data : ''
    const uri = (await Filesystem.getUri({ path: entry.path, directory: currentDir })).uri
    const { title, author, coverUri } = await parseBookMeta(ext, data, entry.name.replace(/\.[^.]+$/, ''))

    return addBook({
      id: uuidv4(),
      title,
      author,
      filePath: uri,
      format: ext,
      coverUri,
      addedAt: Date.now(),
    })
  }

  async function importCurrentFolder() {
    setImportingFolder(true)
    setFolderNotice(null)
    try {
      const bookEntries = await collectBooksFromDirectory(currentPath, currentDir)
      if (!bookEntries.length) {
        setFolderNotice('No supported books found in this folder.')
        return
      }

      const knownPaths = new Set(books.map(book => book.filePath))
      let importedCount = 0
      for (const entry of bookEntries) {
        const storedBook = await importBookEntry(entry)
        if (!knownPaths.has(storedBook.filePath)) {
          importedCount += 1
          knownPaths.add(storedBook.filePath)
        }
      }

      const folderName = breadcrumbs[breadcrumbs.length - 1]?.name || activeRoot
      setFolderNotice(importedCount > 0
        ? `Imported ${importedCount} ${importedCount === 1 ? 'book' : 'books'} from ${folderName}.`
        : `All books from ${folderName} are already in your library.`)
    } catch (e) {
      console.error('importCurrentFolder error', e)
      setFolderNotice('Could not import this folder.')
    } finally {
      setImportingFolder(false)
    }
  }

  async function openFile(entry: FileEntry) {
    const ext = getBookFormat(entry.name)
    if (!SUPPORTED.includes(ext)) return
    setOpening(entry.path)
    try {
      const storedBook = await importBookEntry(entry)
      navigate(`/reader/${storedBook.id}`)
    } catch (e) {
      console.error('openFile error', e)
    }
    setOpening(null)
  }

  return (
    <div className="flex flex-col min-h-[100dvh]" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-[var(--app-gutter)] pb-3 border-b flex-shrink-0" style={{ backgroundColor: headerBg, borderColor: 'var(--border)', paddingTop: 'calc(1rem + var(--safe-top))' }}>
        <HeaderIconButton onClick={() => navigate('/library')} title="Back to library" aria-label="Back to library">
          <FontAwesomeIcon icon={faArrowLeft} />
        </HeaderIconButton>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold">Browse Files</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Open a file or import the current folder.</p>
        </div>
        <button
          onClick={() => void importCurrentFolder()}
          disabled={importingFolder || loading}
          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-50"
          style={{ backgroundColor: 'var(--reader-accent)' }}
        >
          {importingFolder ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <FontAwesomeIcon icon={faPlus} />
          )}
          <span className="hidden sm:inline">Import folder</span>
        </button>
      </div>

      {/* Root selector */}
      <div className="flex gap-2 overflow-x-auto px-[var(--app-gutter)] py-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        {ROOT_DIRS.map(r => (
          <button
            key={r.name}
            onClick={() => switchRoot(r)}
            className={`whitespace-nowrap px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeRoot === r.name ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
          >
            {r.name === 'Downloads'
              ? <><FontAwesomeIcon icon={faDownload} className="mr-1.5" />Downloads</>
              : <><FontAwesomeIcon icon={faFolder} className="mr-1.5" />Documents</>}
          </button>
        ))}
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="flex items-center gap-1 px-[var(--app-gutter)] py-2 overflow-x-auto border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && <span className="text-gray-300 text-xs">/</span>}
              <button
                onClick={() => navigateBreadcrumb(i)}
                className={`text-xs px-1.5 py-0.5 rounded ${i === breadcrumbs.length - 1 ? 'text-orange-500 font-semibold' : 'text-gray-500'}`}
              >
                {crumb.name || 'Root'}
              </button>
            </span>
          ))}
        </div>
      )}

      {folderNotice && (
        <div className="px-[var(--app-gutter)] py-2 text-sm border-b border-gray-100 dark:border-gray-800" style={{ color: 'var(--text-muted)' }}>
          {folderNotice}
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
            <FontAwesomeIcon icon={faFolderOpen} size="2x" />
            <p>No readable files found</p>
          </div>
        ) : (
          entries.map(entry => (
            <button
              key={entry.path}
              className="w-full flex items-center gap-3 px-[var(--app-gutter)] py-3.5 border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-800 text-left"
              onClick={() => entry.isDir ? enterDir(entry) : openFile(entry)}
              disabled={opening === entry.path}
            >
              <span className="w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                {entry.isDir ? (
                  <FontAwesomeIcon icon={faFolder} className="text-xl text-gray-400" />
                ) : previewMap[entry.path]?.coverUri ? (
                  <img src={previewMap[entry.path].coverUri} alt={entry.name} className="w-full h-full object-cover" />
                ) : (
                  <FileTypeIcon fileName={entry.name} className="text-[1.7rem] opacity-75" />
                )}
              </span>
              <span className="flex-1 text-sm truncate">{entry.name}</span>
              {opening === entry.path
                ? <span className="text-xs text-orange-400">Opening…</span>
                : entry.isDir
                  ? <FontAwesomeIcon icon={faChevronRight} className="text-gray-300 text-sm" />
                  : null
              }
            </button>
          ))
        )}
      </div>
    </div>
  )
}
