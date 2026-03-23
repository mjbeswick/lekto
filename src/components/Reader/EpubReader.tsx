import { forwardRef, useEffect, useRef, useCallback, useState, useImperativeHandle } from 'react'
import ePub from 'epubjs'

interface Props {
  /** Decoded EPUB bytes — passed directly to epubjs, no base64 overhead */
  epubBuffer: ArrayBuffer
  initialCfi?: string
  layout?: 'scroll' | 'pages'
  onProgressChange?: (cfi: string, percent: number) => void
  onTocReady?: (toc: TocItem[]) => void
}

export interface TocItem {
  id: string
  label: string
  href: string
  subitems?: TocItem[]
}

export interface EpubReaderHandle {
  display: (target: string) => void
}

const EpubReader = forwardRef<EpubReaderHandle, Props>(function EpubReader(
  { epubBuffer, initialCfi, layout = 'pages', onProgressChange, onTocReady }: Props,
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<any>(null)
  const renditionRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [isSpread, setIsSpread] = useState(false)

  useImperativeHandle(ref, () => ({
    display: (target: string) => {
      renditionRef.current?.display(target)
    },
  }), [])

  // Measure the container so epubjs gets explicit pixel dimensions.
  // This is required for spread mode to work correctly — percentage-based
  // dimensions prevent epubjs from computing page widths.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setDimensions({ width: Math.floor(width), height: Math.floor(height) })
        setIsSpread(width > height)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!renditionRef.current) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') renditionRef.current.next()
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') renditionRef.current.prev()
  }, [])

  useEffect(() => {
    if (!containerRef.current || !epubBuffer?.byteLength || !dimensions) return

    const { width, height } = dimensions
    const isScroll = layout === 'scroll'
    const spread = isScroll ? 'none' : (isSpread ? 'always' : 'none')
    const flow = isScroll ? 'scrolled' : 'paginated'
    const manager = isScroll ? 'continuous' : 'default'

    // Blob URL lets epubjs fetch spine items on demand without holding
    // the full ArrayBuffer on the JS heap for the lifetime of the reader.
    // const blob = new Blob([epubBuffer], { type: 'application/epub+zip' })
    // const blobUrl = URL.createObjectURL(blob)
    const book = ePub(epubBuffer)
    bookRef.current = book

    const rendition = book.renderTo(containerRef.current, {
      width,
      height,
      flow,
      spread,
      manager,
    })
    renditionRef.current = rendition

    rendition.display(initialCfi ?? undefined)

    rendition.on('touchstart', (event: TouchEvent) => {
      const x = event.changedTouches[0].clientX
      const w = window.innerWidth
      if (x < w * 0.3) rendition.prev()
      else if (x > w * 0.7) rendition.next()
    })

    rendition.on('relocated', (location: any) => {
      const cfi = location?.start?.cfi ?? ''
      const percent = book.locations?.percentageFromCfi(cfi) ?? 0
      onProgressChange?.(cfi, percent)
    })

    book.loaded.navigation.then((nav: any) => {
      const map = (items: any[]): TocItem[] =>
        items.map((i: any) => ({
          id: i.id,
          label: i.label.trim(),
          href: i.href,
          subitems: i.subitems?.length ? map(i.subitems) : undefined,
        }))
      onTocReady?.(map(nav.toc))
    })

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      renditionRef.current = null
      bookRef.current = null
      rendition.destroy()
      book.destroy()
      // URL.revokeObjectURL(blobUrl)
    }
    }, [epubBuffer, dimensions, isSpread, layout]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className={`w-full h-full ${layout === 'scroll' ? 'overflow-y-auto' : ''}`} />
      {/* Visual spine for spread mode */}
      {layout !== 'scroll' && isSpread && (
        <div 
          className="absolute top-8 bottom-8 left-1/2 -translate-x-1/2 w-px pointer-events-none" 
          style={{ backgroundColor: 'var(--border)' }}
        />
      )}
    </div>
  )
})

export default EpubReader
