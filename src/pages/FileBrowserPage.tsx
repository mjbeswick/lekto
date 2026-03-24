import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faChevronRight, faFolder, faFolderOpen, faDownload, faBookOpen, faFile } from '@fortawesome/free-solid-svg-icons'
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

interface FileEntry {
  name: string
  path: string
  uri: string
  isDir: boolean
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

export default function FileBrowserPage() {
  const navigate = useNavigate()
  const { addBook } = useLibraryStore()

  const [currentDir, setCurrentDir] = useState<Directory>(Directory.Documents)
  const [currentPath, setCurrentPath] = useState('')
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([ROOT_DIRS[0]])
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)
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
      const BOOK_EXTS = ['.md', '.epub', '.txt', '.pdf', '.docx', '.fb2', '.fb2.zip']
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

  function enterDir(entry: FileEntry) {
    setBreadcrumbs(prev => [...prev, { name: entry.name, path: entry.path, directory: currentDir }])
    setCurrentPath(entry.path)
  }

  function navigateBreadcrumb(index: number) {
    const crumb = breadcrumbs[index]
    setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    setCurrentDir(crumb.directory)
    setCurrentPath(crumb.path)
  }

  function switchRoot(root: typeof ROOT_DIRS[0]) {
    setActiveRoot(root.name as 'Documents' | 'Downloads')
    setCurrentDir(root.directory)
    setCurrentPath('')
    setBreadcrumbs([root])
  }

  async function openFile(entry: FileEntry) {
    const lower = entry.name.toLowerCase()
    const ext = (lower.endsWith('.fb2.zip') ? 'fb2' : lower.split('.').pop()) as BookFormat
    const SUPPORTED = ['md', 'epub', 'txt', 'pdf', 'docx', 'fb2']
    if (!SUPPORTED.includes(ext)) return
    setOpening(entry.path)
    try {
      // Read file data once for metadata, then store URI path
      const file = await Filesystem.readFile({ path: entry.path, directory: currentDir })
      const data = typeof file.data === 'string' ? file.data : ''
      const uri = (await Filesystem.getUri({ path: entry.path, directory: currentDir })).uri

      let title = entry.name.replace(/\.[^.]+$/, '')
      let author = ''
      let coverUri: string | undefined

      const b64ToArrayBuffer = (b64: string) => {
        const bin = atob(b64)
        const buf = new ArrayBuffer(bin.length)
        const view = new Uint8Array(buf)
        for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i)
        return buf
      }

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

      const book: Book = {
        id: uuidv4(),
        title,
        author,
        filePath: uri,   // absolute URI so ReaderPage can read without Directory
        format: ext,
        coverUri,
        addedAt: Date.now(),
      }
      await addBook(book)
      navigate(`/reader/${book.id}`)
    } catch (e) {
      console.error('openFile error', e)
    }
    setOpening(null)
  }

  return (
    <div className="flex flex-col min-h-[100dvh]" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-[var(--app-gutter)] pb-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0" style={{ paddingTop: 'calc(1rem + var(--safe-top))' }}>
        <HeaderIconButton onClick={() => navigate('/library')} title="Back to library" aria-label="Back to library">
          <FontAwesomeIcon icon={faArrowLeft} />
        </HeaderIconButton>
        <h1 className="text-lg font-bold">Browse Files</h1>
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
              <span className="text-xl flex-shrink-0 w-6 flex items-center justify-center text-gray-400">
                <FontAwesomeIcon icon={entry.isDir ? faFolder : entry.name.toLowerCase().endsWith('.epub') ? faBookOpen : faFile} />
              </span>
              <span className="flex-1 text-sm truncate">{entry.name}</span>
              {opening === entry.path
                ? <span className="text-xs text-orange-400">Opening…</span>
                : entry.isDir
                  ? <FontAwesomeIcon icon={faChevronRight} className="text-gray-300 text-sm" />
                  : (() => {
                      const n = entry.name.toLowerCase()
                      const [label, cls] = n.endsWith('.epub') ? ['EPUB', 'bg-blue-100 text-blue-700']
                        : n.endsWith('.pdf')  ? ['PDF',  'bg-red-100 text-red-700']
                        : n.endsWith('.docx') ? ['DOCX', 'bg-indigo-100 text-indigo-700']
                        : n.endsWith('.fb2') || n.endsWith('.fb2.zip') ? ['FB2', 'bg-purple-100 text-purple-700']
                        : n.endsWith('.txt')  ? ['TXT',  'bg-gray-100 text-gray-600']
                        : ['MD', 'bg-green-100 text-green-700']
                      return <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-semibold ${cls}`}>{label}</span>
                    })()
              }
            </button>
          ))
        )}
      </div>
    </div>
  )
}
