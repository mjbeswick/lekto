import { useState, useEffect, useRef } from 'react'
import { getBook, updateLastOpened } from '../db/books'
import { getProgress } from '../db/progress'
import type { Book, TocItem } from '../types'
import { readFileContent, readFileAsArrayBuffer } from '../utils/fileStore'
import { epubToHtml } from '../utils/epubParser'
import { docxToHtml } from '../utils/docxParser'
import { fb2ToHtml } from '../utils/fb2Parser'
import { stripMarkdown } from '../utils/textTokenizer'

type ContentValue = { html: string } | { markdown: string } | null

function slugify(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : `heading-${index}`
}

/**
 * Parse h1–h3 headings from an HTML string, inject stable IDs into the HTML,
 * and return TocItem[].
 */
export function extractTocFromHtml(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = []
  const usedSlugs = new Set<string>()
  let index = 0

  const result = html.replace(/<(h[1-3])(\s[^>]*)?>([^<]*(?:<(?!\/h[1-3]>)[^<]*)*)<\/h[1-3]>/gi, (match, tag, attrs, inner) => {
    const label = inner.replace(/<[^>]+>/g, '').trim()
    if (!label) return match

    let slug = slugify(label, index)
    // Ensure uniqueness
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${index}`
    }
    usedSlugs.add(slug)
    toc.push({ id: slug, label })
    index++

    const existingId = (attrs ?? '').match(/\bid\s*=\s*["']([^"']+)["']/i)
    if (existingId) {
      // Replace existing id with our slug
      const newAttrs = (attrs ?? '').replace(/\bid\s*=\s*["'][^"']*["']/i, `id="${slug}"`)
      return `<${tag}${newAttrs}>${inner}</${tag}>`
    }
    return `<${tag}${attrs ?? ''} id="${slug}">${inner}</${tag}>`
  })

  return { html: result, toc }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export interface BookContentResult {
  book: Book | null
  content: ContentValue
  plainText: string
  toc: TocItem[]
  initialOffset: number
  initialPage: number
  loading: boolean
}

export function useBookContent(bookId: string | undefined, layout: string): BookContentResult {
  const [book, setBook] = useState<Book | null>(null)
  const [content, setContent] = useState<ContentValue>(null)
  const [plainText, setPlainText] = useState('')
  const [toc, setToc] = useState<TocItem[]>([])
  const [initialOffset, setInitialOffset] = useState(0)
  const [initialPage, setInitialPage] = useState(0)
  const [loading, setLoading] = useState(true)

  // Prevent double-run in strict mode
  const loadedRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!bookId) return
    if (loadedRef.current === bookId) return
    loadedRef.current = bookId

    // Reset state for new book
    setBook(null)
    setContent(null)
    setPlainText('')
    setToc([])
    setInitialOffset(0)
    setInitialPage(0)
    setLoading(true)

    void (async () => {
      try {
        const b = await getBook(bookId)
        if (!b) return
        setBook(b)

        await updateLastOpened(bookId)

        const saved = await getProgress(bookId)

        // Parse saved position — treat old EPUB CFI strings as no position
        let savedOffset = 0
        let savedPage = 0
        if (saved) {
          const pos = saved.position
          const isCfi = pos.startsWith('epubcfi(')
          if (!isCfi) {
            if (pos.startsWith('scroll:')) {
              savedOffset = Number(pos.slice('scroll:'.length)) || 0
            } else if (pos.startsWith('page:')) {
              savedPage = parseInt(pos.slice('page:'.length)) || 0
            }
          }
        }

        setInitialOffset(savedOffset)
        setInitialPage(savedPage)

        const format = b.format

        if (format === 'epub') {
          const buffer = await readFileAsArrayBuffer(b.filePath)
          const rawHtml = await epubToHtml(buffer)
          const { html, toc: extractedToc } = extractTocFromHtml(rawHtml)
          setContent({ html })
          setPlainText(stripHtml(html))
          setToc(extractedToc)
        } else if (format === 'docx') {
          const buffer = await readFileAsArrayBuffer(b.filePath)
          const rawHtml = await docxToHtml(buffer)
          const { html, toc: extractedToc } = extractTocFromHtml(rawHtml)
          setContent({ html })
          setPlainText(stripHtml(html))
          setToc(extractedToc)
        } else if (format === 'fb2') {
          const buffer = await readFileAsArrayBuffer(b.filePath)
          const rawHtml = await fb2ToHtml(buffer)
          const { html, toc: extractedToc } = extractTocFromHtml(rawHtml)
          setContent({ html })
          setPlainText(stripHtml(html))
          setToc(extractedToc)
        } else if (format === 'pdf') {
          // PDF not supported in new architecture — leave content null
        } else {
          // md / txt
          const text = await readFileContent(b.filePath)
          setContent({ markdown: text })
          setPlainText(stripMarkdown(text))
          setToc([])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [bookId, layout])

  return { book, content, plainText, toc, initialOffset, initialPage, loading }
}
