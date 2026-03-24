import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type { TocItem } from './EpubReader'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

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
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const currentPageRef = useRef(initialPage)
  const totalPagesRef = useRef(0)
  const [pageCount, setPageCount] = useState(0)

  useImperativeHandle(ref, () => ({
    goToPage: (page: number) => {
      scrollToPage(page)
    },
  }))

  const scrollToPage = useCallback((page: number) => {
    const canvas = canvasRefs.current[page - 1]
    canvas?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [])

  const renderPage = useCallback(async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    const canvas = canvasRefs.current[pageNum - 1]
    if (!canvas) return
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: SCALE })
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
  }, [])

  useEffect(() => {
    if (!pdfBuffer?.byteLength) return
    let cancelled = false

    pdfjsLib.getDocument({ data: pdfBuffer.slice(0) }).promise.then(async (pdf) => {
      if (cancelled) return
      pdfRef.current = pdf
      totalPagesRef.current = pdf.numPages
      setPageCount(pdf.numPages)

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
          if (!cancelled) scrollToPage(initialPage)
        })
      } else {
        // Paginated: only render current page
        await renderPage(pdf, currentPageRef.current)
      }
    })

    return () => { cancelled = true }
  }, [pdfBuffer, layout, initialPage, renderPage, scrollToPage, onTocReady]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const percent = totalPagesRef.current > 0 ? bestPage / totalPagesRef.current : 0
      onProgressChange?.(`pdf:${bestPage}`, percent)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [layout, onProgressChange])

  const goToPrev = useCallback(async () => {
    if (currentPageRef.current <= 1 || !pdfRef.current) return
    currentPageRef.current--
    await renderPage(pdfRef.current, currentPageRef.current)
    const percent = totalPagesRef.current > 0 ? currentPageRef.current / totalPagesRef.current : 0
    onProgressChange?.(`pdf:${currentPageRef.current}`, percent)
  }, [renderPage, onProgressChange])

  const goToNext = useCallback(async () => {
    if (!pdfRef.current || currentPageRef.current >= totalPagesRef.current) return
    currentPageRef.current++
    await renderPage(pdfRef.current, currentPageRef.current)
    const percent = totalPagesRef.current > 0 ? currentPageRef.current / totalPagesRef.current : 0
    onProgressChange?.(`pdf:${currentPageRef.current}`, percent)
  }, [renderPage, onProgressChange])

  // Keyboard navigation (paginated mode)
  useEffect(() => {
    if (layout !== 'pages') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToNext()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [layout, goToNext, goToPrev])

  if (layout === 'scroll') {
    return (
      <div ref={containerRef} className="h-full overflow-y-auto flex flex-col items-center gap-4 py-4 px-2">
        {Array.from({ length: pageCount || 1 }, (_, i) => (
          <canvas
            key={i}
            ref={(el) => { canvasRefs.current[i] = el }}
            className="max-w-full shadow"
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
          ref={(el) => { canvasRefs.current[0] = el }}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      <div className="flex gap-8 py-3">
        <button
          onClick={goToPrev}
          className="px-4 py-2 rounded-lg text-sm opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Previous page"
        >
          ← Prev
        </button>
        <button
          onClick={goToNext}
          className="px-4 py-2 rounded-lg text-sm opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  )
})

export default PdfReader
