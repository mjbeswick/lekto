import mammoth from 'mammoth'
import JSZip from 'jszip'

export interface DocxMeta {
  title: string
  author: string
}

export async function parseDocxMeta(data: ArrayBuffer): Promise<DocxMeta> {
  try {
    const zip = await JSZip.loadAsync(data)
    const coreXml = await zip.file('docProps/core.xml')?.async('string')
    if (!coreXml) return { title: 'Unknown', author: '' }

    const title = coreXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i)?.[1]?.trim() ?? 'Unknown'
    const author = coreXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i)?.[1]?.trim() ?? ''
    return { title, author }
  } catch {
    return { title: 'Unknown', author: '' }
  }
}

export async function docxToHtml(data: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToHtml({ arrayBuffer: data })
  return result.value
}

export async function extractDocxText(data: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: data })
  return result.value
}
