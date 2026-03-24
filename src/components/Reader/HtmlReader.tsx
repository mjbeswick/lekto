import { useEffect, useRef, type CSSProperties } from 'react'
import { useAppStore } from '../../store/appStore'
import { getReaderFontStack } from '../../utils/readerFonts'

interface Props {
  html: string
  initialOffset?: number
  onProgressChange?: (offset: number, percent: number) => void
}

export default function HtmlReader({ html, initialOffset = 0, onProgressChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const restoredRef = useRef(false)
  const { fontSize, fontFamily, lineHeight, paragraphSpacing, maxWidth, removeBookMargins, removePageBackground } = useAppStore()

  // Restore scroll position once after first render
  useEffect(() => {
    if (restoredRef.current) return
    const el = containerRef.current
    if (!el || !html) return
    restoredRef.current = true
    requestAnimationFrame(() => {
      if (el) el.scrollTop = initialOffset
    })
  }, [html, initialOffset])

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

  const ff = getReaderFontStack(fontFamily)
  const proseStyle = { '--reader-paragraph-spacing': `${paragraphSpacing}em` } as CSSProperties

  return (
    <div ref={containerRef} className="h-full overflow-y-auto" style={{ fontFamily: ff, fontSize, lineHeight }}>
      <div
        className={`mx-auto min-h-full w-full ${maxWidth ? 'max-w-2xl' : 'max-w-none'}`}
        style={{ backgroundColor: removePageBackground ? 'transparent' : 'var(--reader-page-bg)' }}
      >
        <div
          className={`reader-prose prose prose-base sm:prose-lg prose-orange dark:prose-invert ${removeBookMargins ? 'px-0 py-0 sm:px-0 sm:py-0' : 'px-4 py-6 sm:px-6 sm:py-8'}`}
          style={proseStyle}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
