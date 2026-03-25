export interface PdfMeta {
  title: string
  author: string
  coverBase64?: string
  pageCount: number
}

/** Returns minimal metadata for a PDF without rendering it (pdfjs-dist removed). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function parsePdfMeta(_data: ArrayBuffer): Promise<PdfMeta> {
  return { title: 'Unknown', author: '', pageCount: 0 }
}
