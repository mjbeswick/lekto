import { useEffect, useRef, useCallback } from 'react'
import ePub from 'epubjs'

interface Props {
  /** Decoded EPUB bytes — passed directly to epubjs, no base64 overhead */
  epubBuffer: ArrayBuffer
  initialCfi?: string
  onProgressChange?: (cfi: string, percent: number) => void
  onTocReady?: (toc: TocItem[]) => void
}

export interface TocItem {
  id: string
  label: string
  href: string
  subitems?: TocItem[]
}

export default function EpubReader({ epubBuffer, initialCfi, onProgressChange, onTocReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<any>(null)
  const renditionRef = useRef<any>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!renditionRef.current) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') renditionRef.current.next()
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') renditionRef.current.prev()
  }, [])

  useEffect(() => {
    if (!containerRef.current || !epubBuffer?.byteLength) return

    const book = ePub(epubBuffer.slice(0))
    bookRef.current = book

    const rendition = book.renderTo(containerRef.current, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      spread: 'none',
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
      rendition.destroy()
      book.destroy()
    }
  }, [epubBuffer]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="w-full h-full" />
}
