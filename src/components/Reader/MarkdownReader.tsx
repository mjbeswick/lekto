import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../../store/appStore'
import HighlightMenu from './HighlightMenu'
import { getReaderFontStack } from '../../utils/readerFonts'

interface SelectionState {
  x: number
  y: number
  text: string
  start: number
  end: number
}

interface Props {
  content: string
  initialOffset?: number
  onProgressChange?: (offset: number, percent: number) => void
  onHighlight?: (start: number, end: number, text: string, color: string) => void
  onNote?: (text: string) => void
}

export default function MarkdownReader({ content, initialOffset = 0, onProgressChange, onHighlight, onNote }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const restoredRef = useRef(false)
  const { fontSize, fontFamily, lineHeight, paragraphSpacing, maxWidth, removeBookMargins } = useAppStore()
  const [selection, setSelection] = useState<SelectionState | null>(null)
  const [noteText, setNoteText] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)

  // Restore scroll position once after first render
  useEffect(() => {
    if (restoredRef.current) return
    const el = containerRef.current
    if (!el || !content) return
    restoredRef.current = true
    requestAnimationFrame(() => {
      if (el) el.scrollTop = initialOffset
    })
  }, [content, initialOffset])

  // Save scroll progress
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = () => {
      const scrollable = el.scrollHeight - el.clientHeight
      const percent = scrollable > 0 ? el.scrollTop / scrollable : 1
      onProgressChange?.(Math.round(el.scrollTop), percent)
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [onProgressChange])

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null)
      return
    }
    const text = sel.toString().trim()
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const start = content.indexOf(text)
    const end = start + text.length
    setSelection({ x: rect.left + rect.width / 2, y: rect.top, text, start, end })
  }, [content])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [handleSelectionChange])

  const handleHighlight = (color: string) => {
    if (!selection) return
    onHighlight?.(selection.start, selection.end, selection.text, color)
    window.getSelection()?.removeAllRanges()
    setSelection(null)
  }

  const handleNoteSubmit = () => {
    if (noteText.trim()) onNote?.(noteText.trim())
    setNoteText('')
    setShowNoteInput(false)
    setSelection(null)
  }

  const ff = getReaderFontStack(fontFamily)
  const proseStyle = { '--reader-paragraph-spacing': `${paragraphSpacing}em` } as CSSProperties

  return (
    <>
      <div ref={containerRef} className="h-full overflow-y-auto" style={{ fontFamily: ff, fontSize, lineHeight }}>
        <div className={`reader-prose mx-auto prose prose-base sm:prose-lg prose-orange dark:prose-invert ${removeBookMargins ? 'px-0 py-0 sm:px-0 sm:py-0' : 'px-4 py-6 sm:px-6 sm:py-8'} ${maxWidth ? 'max-w-2xl' : 'max-w-none'}`} style={proseStyle}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>

      {selection && !showNoteInput && (
        <HighlightMenu
          x={selection.x}
          y={selection.y}
          selectedText={selection.text}
          onHighlight={handleHighlight}
          onNote={() => setShowNoteInput(true)}
          onClose={() => setSelection(null)}
        />
      )}

      {showNoteInput && (
        <div
          className="fixed inset-x-3 z-40 rounded-2xl border p-4 shadow-2xl sm:inset-x-4"
          style={{ bottom: 'calc(1rem + var(--safe-bottom))', backgroundColor: 'var(--reader-bg)', borderColor: 'var(--border)' }}
        >
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Add note</p>
          <textarea
            className="w-full text-sm rounded-xl p-3 resize-none outline-none bg-transparent border"
            style={{ borderColor: 'var(--border)', color: 'var(--reader-fg)' }}
            rows={3}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Write your note…"
            autoFocus
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button onClick={() => setShowNoteInput(false)} className="text-sm px-3 py-1" style={{ color: 'var(--text-muted)' }}>Cancel</button>
            <button onClick={handleNoteSubmit} className="text-sm text-white px-4 py-1 rounded-xl" style={{ backgroundColor: 'var(--reader-accent)' }}>Save</button>
          </div>
        </div>
      )}
    </>
  )
}
