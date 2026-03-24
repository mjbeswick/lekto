import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type { TocItem } from './EpubReader'
import { useAppStore } from '../../store/appStore'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

interface Props {
  pdfBuffer: ArrayBuffer
  initialPage?: number
  layout?: 'scroll' | 'pages'
  onProgressChange?: (position: string, percent: number) => void
  onTocReady?: (toc: TocItem[]) => void
}

export interface PdfReaderHandle {
  goToPage: (page: number) => void
}

const SCALE = 1.5

const PdfReader = forwardRef<PdfReaderHandle, Props>(function PdfReader(
  { pdfBuffer, initialPage = 1, layout = 'pages', onProgressChange, onTocReady }: Props,
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const paginatedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const currentPageRef = useRef(initialPage)
  const totalPagesRef = useRef(0)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [containerHeight, setContainerHeight] = useState(0)
  const removeBookMargins = useAppStore(s => s.removeBookMargins)
  const scrollPageFill = useAppStore(s => s.scrollPageFill)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const nextHeight = Math.floor(entries[0].contentRect.height)
      if (nextHeight > 0) setContainerHeight(nextHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [layout])

  const renderPage = useCallback(async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    const canvas = layout === 'scroll'
      ? canvasRefs.current[pageNum - 1]
      : paginatedCanvasRef.current
    if (!canvas) return
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: SCALE })
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
  }, [layout])

  const updateProgress = useCallback((page: number) => {
    const percent = totalPagesRef.current > 0 ? page / totalPagesRef.current : 0
    onProgressChange?.(`pdf:${page}`, percent)
  }, [onProgressChange])

  const scrollToPage = useCallback((page: number) => {
    const canvas = canvasRefs.current[page - 1]
    canvas?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [])

  const navigateToPage = useCallback(async (page: number) => {
    if (!pdfRef.current || totalPagesRef.current < 1) return
    const nextPage = Math.max(1, Math.min(page, totalPagesRef.current))
    currentPageRef.current = nextPage
    setCurrentPage(nextPage)

    if (layout === 'scroll') {
      scrollToPage(nextPage)
      updateProgress(nextPage)
      return
    }

    await renderPage(pdfRef.current, nextPage)
    updateProgress(nextPage)
  }, [layout, renderPage, scrollToPage, updateProgress])

  useImperativeHandle(ref, () => ({
    goToPage: (page: number) => {
      void navigateToPage(page)
    },
  }), [navigateToPage])

  useEffect(() => {
    if (!pdfBuffer?.byteLength) return
    let cancelled = false

    pdfjsLib.getDocument({ data: pdfBuffer.slice(0) }).promise.then(async (pdf) => {
      if (cancelled) return
      pdfRef.current = pdf
      totalPagesRef.current = pdf.numPages
      setPageCount(pdf.numPages)
      const startPage = Math.max(1, Math.min(initialPage, pdf.numPages))
      currentPageRef.current = startPage
      setCurrentPage(startPage)

      // Extract TOC from PDF outline
      try {
        const outline = await pdf.getOutline()
        if (outline?.length) {
          const mapItems = (items: any[]): TocItem[] =>
            items.map((item, i) => ({
              id: String(i),
              label: item.title ?? '',
              href: '',
              subitems: item.items?.length ? mapItems(item.items) : undefined,
            }))
          onTocReady?.(mapItems(outline))
        }
      } catch {
        // outline is optional
      }

      if (layout === 'scroll') {
        // Render all pages — canvases are already in the DOM via the render below
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) break
          await renderPage(pdf, i)
        }
        // Restore scroll position
        requestAnimationFrame(() => {
          if (!cancelled) {
            scrollToPage(startPage)
            updateProgress(startPage)
          }
        })
      } else {
        // Paginated: only render current page
        await renderPage(pdf, startPage)
        updateProgress(startPage)
      }
    })

    return () => { cancelled = true }
  }, [pdfBuffer, layout, initialPage, renderPage, scrollToPage, onTocReady, updateProgress]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll mode: report progress on scroll
  useEffect(() => {
    if (layout !== 'scroll') return
    const el = containerRef.current
    if (!el) return

    const handleScroll = () => {
      // Find which page canvas is most visible
      const containerRect = el.getBoundingClientRect()
      let bestPage = 1
      let bestOverlap = 0
      canvasRefs.current.forEach((canvas, i) => {
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const overlap = Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top)
        if (overlap > bestOverlap) {
          bestOverlap = overlap
          bestPage = i + 1
        }
      })
      currentPageRef.current = bestPage
      setCurrentPage(bestPage)
      updateProgress(bestPage)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [layout, updateProgress])

  const goToPrev = useCallback(async () => {
    if (currentPageRef.current <= 1) return
    await navigateToPage(currentPageRef.current - 1)
  }, [navigateToPage])

  const goToNext = useCallback(async () => {
    if (currentPageRef.current >= totalPagesRef.current) return
    await navigateToPage(currentPageRef.current + 1)
  }, [navigateToPage])

  // Keyboard navigation (paginated mode)
  useEffect(() => {
    if (layout !== 'pages') return
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        void goToNext()
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        void goToPrev()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [layout, goToNext, goToPrev])

  if (layout === 'scroll') {
    const viewportHeight = Math.max(160, containerHeight - (removeBookMargins ? 0 : 32))

    return (
      <div ref={containerRef} className={`flex h-full flex-col items-center overflow-y-auto ${removeBookMargins ? 'gap-0 px-0 py-0' : 'gap-4 px-2 py-4'}`}>
        {Array.from({ length: pageCount || 1 }, (_, i) => (
          <canvas
            key={i}
            ref={(el) => { canvasRefs.current[i] = el }}
            className="shadow"
            style={scrollPageFill === 'width'
              ? { width: '100%', height: 'auto', maxWidth: '100%' }
              : { width: 'auto', height: `${viewportHeight}px`, maxWidth: 'none' }}
          />
        ))}
      </div>
    )
  }

  // Paginated mode
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
        <canvas
          ref={paginatedCanvasRef}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      <div className="py-3 text-sm tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {currentPage} / {pageCount || totalPagesRef.current || 1}
      </div>
    </div>
  )
})

export default PdfReader
