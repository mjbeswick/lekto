import { useState, useRef, useCallback, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faBolt } from '@fortawesome/free-solid-svg-icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../../store/appStore'
import { getReadingPosition, setReadingPosition } from '../../utils/positionSync'

const SPREAD_BREAKPOINT = 720  // px — show two pages side-by-side above this width

// Rough chars-per-page estimate based on font size
function charsPerPage(fontSize: number): number {
  return Math.round(800 * (18 / fontSize))
}

function splitIntoPages(text: string, fontSize: number): string[] {
  const cpp = charsPerPage(fontSize)
  const pages: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= cpp) {
      pages.push(remaining)
      break
    }
    let breakAt = cpp
    const paragraphBreak = remaining.lastIndexOf('\n\n', cpp)
    const sentenceBreak = remaining.lastIndexOf('. ', cpp)
    if (paragraphBreak > cpp * 0.5) breakAt = paragraphBreak + 2
    else if (sentenceBreak > cpp * 0.5) breakAt = sentenceBreak + 2
    pages.push(remaining.slice(0, breakAt))
    remaining = remaining.slice(breakAt)
  }

  return pages.length ? pages : ['']
}

interface Props {
  content: string
  initialPage?: number
  onProgressChange?: (page: number, percent: number) => void
  onWordTap?: () => void
}

function PageColumn({ text, ff, fontSize, lineHeight, contentRef }: {
  text: string
  ff: string
  fontSize: number
  lineHeight: number
  contentRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={contentRef}
      className="flex-1 overflow-hidden px-8 py-6"
      style={{ fontFamily: ff, fontSize, lineHeight }}
    >
      <div className="prose prose-lg prose-orange dark:prose-invert max-w-none h-full overflow-hidden">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    </div>
  )
}

export default function PaginatedReader({ content, initialPage = 0, onProgressChange, onWordTap }: Props) {
  const { fontSize, fontFamily, lineHeight } = useAppStore()
  const pages = splitIntoPages(content, fontSize)
  const totalPages = pages.length

  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const [containerWidth, setContainerWidth] = useState(() => window.innerWidth)
  const [tapHint, setTapHint] = useState(false)

  // Detect container width changes
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isSpread = containerWidth >= SPREAD_BREAKPOINT
  // In spread mode pages advance by 2, aligned to even indices
  const step = isSpread ? 2 : 1
  const stepRef = useRef(step)
  stepRef.current = step
  const isSpreadRef = useRef(isSpread)
  isSpreadRef.current = isSpread

  // On re-mount after a mode switch, reading position reflects where speed reader left off
  const [page, setPage] = useState(() => {
    const fraction = getReadingPosition()
    if (fraction > 0 && totalPages > 1) {
      return Math.max(0, Math.min(Math.floor(fraction * totalPages), totalPages - 1))
    }
    return initialPage
  })

  // Clamp & align page when content or spread mode changes
  useEffect(() => {
    setPage(p => {
      const max = Math.max(0, totalPages - 1)
      const clamped = Math.min(p, max)
      return isSpread && clamped % 2 === 1 ? Math.max(0, clamped - 1) : clamped
    })
  }, [totalPages, isSpread])

  const goTo = useCallback((p: number) => {
    let target = Math.max(0, Math.min(p, totalPages - 1))
    // Snap to spread-aligned (even) page when in spread mode
    if (isSpreadRef.current && target % 2 === 1) target = Math.max(0, target - 1)
    setPage(target)
    if (totalPages > 1) setReadingPosition(target / (totalPages - 1))
    onProgressChange?.(target, totalPages > 1 ? target / (totalPages - 1) : 1)
  }, [totalPages, onProgressChange])

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    const s = stepRef.current
    if (dx < 0) goTo(page + s)
    else goTo(page - s)
  }

  const handleTap = (e: React.MouseEvent) => {
    const x = e.clientX
    const w = window.innerWidth
    if (x < w * 0.15) {
      goTo(page - stepRef.current)
    } else if (x > w * 0.85) {
      goTo(page + stepRef.current)
    } else if (!isSpreadRef.current && onWordTap) {
      // Center tap only in single-page mode — spread centre is the spine
      const rect = contentRef.current?.getBoundingClientRect()
      if (rect && totalPages > 0) {
        const yRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
        setReadingPosition((page + yRatio) / totalPages)
      }
      onWordTap()
    }
  }

  // Show tap hint briefly on mount (single-page mode only)
  useEffect(() => {
    if (!onWordTap || isSpread) return
    setTapHint(true)
    const t = setTimeout(() => setTapHint(false), 2500)
    return () => clearTimeout(t)
  }, [isSpread])

  const ff = fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : 'Inter, system-ui, sans-serif'

  // Spread display: current spread covers pages [page, page+1]
  const rightPage = Math.min(page + 1, totalPages - 1)
  const spreadLabel = isSpread
    ? `${page + 1}–${Math.min(page + 2, totalPages)} / ${totalPages}`
    : `${page + 1} / ${totalPages}`

  return (
    <div
      ref={wrapperRef}
      className="h-full flex flex-col overflow-hidden select-none relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
    >
      {/* Content area */}
      <div className="flex-1 overflow-hidden flex">
        {isSpread ? (
          <>
            <PageColumn text={pages[page] ?? ''} ff={ff} fontSize={fontSize} lineHeight={lineHeight} />
            {/* Book spine */}
            <div className="flex-shrink-0 w-px self-stretch my-4" style={{ backgroundColor: 'var(--border)' }} />
            <PageColumn text={pages[rightPage] ?? ''} ff={ff} fontSize={fontSize} lineHeight={lineHeight} />
          </>
        ) : (
          <PageColumn
            contentRef={contentRef}
            text={pages[page] ?? ''}
            ff={ff}
            fontSize={fontSize}
            lineHeight={lineHeight}
          />
        )}
      </div>

      {/* Page indicator */}
      <div className="flex-shrink-0 flex items-center justify-center gap-3 py-3 border-t"
        style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => goTo(page - step)} disabled={page === 0}
          className="disabled:opacity-30 px-2 py-1" style={{ color: 'var(--text-muted)' }}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{spreadLabel}</span>
        <button onClick={() => goTo(page + step)} disabled={page >= totalPages - step}
          className="disabled:opacity-30 px-2 py-1" style={{ color: 'var(--text-muted)' }}>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {/* Tap-to-start hint (single-page mode only) */}
      {onWordTap && !isSpread && (
        <div
          className={`absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium pointer-events-none transition-opacity duration-500 ${tapHint ? 'opacity-70' : 'opacity-0'}`}
          style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}
        >
          <FontAwesomeIcon icon={faBolt} className="text-orange-400" />
          Tap center to speed read from here
        </div>
      )}
    </div>
  )
}
