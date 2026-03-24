import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export interface PdfMeta {
  title: string
  author: string
  coverBase64?: string
  pageCount: number
}

export async function parsePdfMeta(data: ArrayBuffer): Promise<PdfMeta> {
  const pdf = await pdfjsLib.getDocument({ data: data.slice(0) }).promise
  const info = await pdf.getMetadata().catch(() => ({ info: {} }))
  const meta = (info as { info?: Record<string, string> }).info ?? {}

  const title = (meta['Title'] as string | undefined)?.trim() || 'Unknown'
  const author = (meta['Author'] as string | undefined)?.trim() || ''
  const pageCount = pdf.numPages

  let coverBase64: string | undefined
  try {
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 0.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    coverBase64 = canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    // cover generation is best-effort
  }

  return { title, author, coverBase64, pageCount }
}

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: data.slice(0) }).promise
  const parts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (pageText) parts.push(pageText)
  }

  return parts.join('\n\n')
}
