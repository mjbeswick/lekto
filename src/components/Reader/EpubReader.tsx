import { forwardRef, useEffect, useRef, useCallback, useState, useImperativeHandle } from 'react'
import ePub from 'epubjs'
import { useAppStore } from '../../store/appStore'
import { getReaderFontStack } from '../../utils/readerFonts'

interface Props {
  /** Decoded EPUB bytes — passed directly to epubjs, no base64 overhead */
  epubBuffer: ArrayBuffer
  initialCfi?: string
  layout?: 'scroll' | 'pages'
  onProgressChange?: (cfi: string, percent: number) => void
  onTocReady?: (toc: TocItem[]) => void
  onLocationChange?: (href: string) => void
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

const EPUB_THEME_NAME = 'lekto-reader'
const EPUB_BASE_FONT_SIZE = 18

function flattenToc(items: TocItem[]): TocItem[] {
  return items.flatMap(item => [item, ...flattenToc(item.subitems ?? [])])
}

function applyTypographyTheme(
  rendition: any,
  fontSize: number,
  fontStack: string,
  lineHeight: number,
  paragraphSpacing: number,
  textColor: string,
  accentColor: string,
  removeBookMargins: boolean,
  pageBackgroundColor: string,
) {
  const fontScale = `${Math.round((fontSize / EPUB_BASE_FONT_SIZE) * 100)}%`
  const paragraphMargin = `${paragraphSpacing}em`
  const listParagraphMargin = `${Math.max(0, paragraphSpacing * 0.65)}em`
  const outerSpacing = removeBookMargins ? '0 !important' : '16px !important'

  rendition.themes?.register(EPUB_THEME_NAME, {
    ':root': {
      'margin': '0 !important',
      'padding': '0 !important',
      'background-color': `${pageBackgroundColor} !important`,
    },
    body: {
      'margin': '0 !important',
      'padding': outerSpacing,
      'background-color': `${pageBackgroundColor} !important`,
    },
    p: {
      'margin-top': '0 !important',
      'margin-bottom': `${paragraphMargin} !important`,
    },
    'li p': {
      'margin-bottom': `${listParagraphMargin} !important`,
    },
    'p:last-child': {
      'margin-bottom': '0 !important',
    },
    'a[href]': {
      'color': `${accentColor} !important`,
    },
  })

  rendition.themes?.select(EPUB_THEME_NAME)
  rendition.themes?.override('font-size', fontScale, true)
  rendition.themes?.font(fontStack)
  rendition.themes?.override('line-height', `${lineHeight}`, true)
  rendition.themes?.override('color', textColor, true)
  rendition.themes?.override('background-color', pageBackgroundColor, true)
}

const EpubReader = forwardRef<EpubReaderHandle, Props>(function EpubReader(
  { epubBuffer, initialCfi, layout = 'pages', onProgressChange, onTocReady, onLocationChange }: Props,
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<any>(null)
  const renditionRef = useRef<any>(null)
  const flatTocRef = useRef<TocItem[]>([])
  const currentHrefRef = useRef('')
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [isSpread, setIsSpread] = useState(false)
  const { fontSize, fontFamily, lineHeight, paragraphSpacing, accentColor, removeBookMargins, removePageBackground } = useAppStore()
  const fontStack = getReaderFontStack(fontFamily)
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--reader-fg').trim() || '#1f1b14'
  const pageBackgroundColor = removePageBackground
    ? 'transparent'
    : getComputedStyle(document.documentElement).getPropertyValue('--reader-page-bg').trim() || '#ffffff'

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
    if (e.key === 'ArrowRight') {
      renditionRef.current.next()
    } else if (e.key === 'ArrowLeft') {
      renditionRef.current.prev()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const flat = flatTocRef.current
      if (!flat.length) return
      const current = currentHrefRef.current
      const idx = flat.findIndex(item => item.href.split('#')[0] === current.split('#')[0])
      const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1
      if (next >= 0 && next < flat.length) renditionRef.current.display(flat[next].href)
    }
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
    applyTypographyTheme(rendition, fontSize, fontStack, lineHeight, paragraphSpacing, textColor, accentColor, removeBookMargins, pageBackgroundColor)

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
      const href = location?.start?.href ?? ''
      currentHrefRef.current = href
      onLocationChange?.(href)
    })

    book.loaded.navigation.then((nav: any) => {
      const map = (items: any[]): TocItem[] =>
        items.map((i: any) => ({
          id: i.id,
          label: i.label.trim(),
          href: i.href,
          subitems: i.subitems?.length ? map(i.subitems) : undefined,
        }))
      const tocItems = map(nav.toc)
      onTocReady?.(tocItems)
      flatTocRef.current = flattenToc(tocItems)
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
    }, [epubBuffer, dimensions, isSpread, layout, pageBackgroundColor]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const rendition = renditionRef.current
    if (!rendition) return

    applyTypographyTheme(rendition, fontSize, fontStack, lineHeight, paragraphSpacing, textColor, accentColor, removeBookMargins, pageBackgroundColor)

    if (!dimensions) return
    requestAnimationFrame(() => {
      rendition.resize(dimensions.width, dimensions.height)
    })
  }, [fontSize, fontStack, lineHeight, paragraphSpacing, textColor, accentColor, removeBookMargins, pageBackgroundColor, dimensions])

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className={`w-full h-full ${layout === 'scroll' ? 'overflow-y-auto' : ''}`}
        style={{ backgroundColor: removePageBackground ? 'transparent' : 'var(--reader-page-bg)' }}
      />
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
