import JSZip from 'jszip'

export interface EpubMeta {
  title: string
  author: string
  coverBase64?: string  // data URI
}

function base64ToBytes(base64Data: string): Uint8Array {
  const binary = atob(base64Data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function htmlToText(html: string): string {
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
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function parseEpubMeta(base64Data: string): Promise<EpubMeta> {
  const zip = await JSZip.loadAsync(base64ToBytes(base64Data))

  const containerXml = await zip.file('META-INF/container.xml')?.async('string')
  if (!containerXml) return { title: 'Unknown', author: '' }

  const opfPath = containerXml.match(/full-path="([^"]+\.opf)"/i)?.[1]
  if (!opfPath) return { title: 'Unknown', author: '' }

  const opfXml = await zip.file(opfPath)?.async('string')
  if (!opfXml) return { title: 'Unknown', author: '' }

  const title = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i)?.[1]?.trim() ?? 'Unknown'
  const author = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i)?.[1]?.trim() ?? ''

  let coverBase64: string | undefined
  const coverItemMatch = opfXml.match(/id="cover-image"[^>]*href="([^"]+)"/i)
    ?? opfXml.match(/properties="cover-image"[^>]*href="([^"]+)"/i)
    ?? opfXml.match(/<item[^>]*href="([^"]+\.(jpg|jpeg|png|gif|webp))"[^>]*id="cover"/i)
  if (coverItemMatch) {
    const coverPath = new URL(coverItemMatch[1], `epub:///${opfPath}`).pathname.replace(/^\//, '')
    const coverFile = zip.file(coverPath) ?? zip.file(coverItemMatch[1])
    if (coverFile) {
      const coverData = await coverFile.async('base64')
      const ext = coverItemMatch[1].split('.').pop()?.toLowerCase() ?? 'jpeg'
      const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
      coverBase64 = `data:${mime};base64,${coverData}`
    }
  }

  return { title, author, coverBase64 }
}

/** Extract all readable text from an EPUB in spine order. */
export async function extractEpubText(base64Data: string): Promise<string> {
  const zip = await JSZip.loadAsync(base64ToBytes(base64Data))

  const containerXml = await zip.file('META-INF/container.xml')?.async('string')
  if (!containerXml) throw new Error('No META-INF/container.xml')

  const opfPath = containerXml.match(/full-path="([^"]+\.opf)"/i)?.[1]
  if (!opfPath) throw new Error('Could not find OPF path in container.xml')

  const opfXml = await zip.file(opfPath)?.async('string')
  if (!opfXml) throw new Error(`Could not read OPF file: ${opfPath}`)

  const opfDir = opfPath.includes('/') ? opfPath.replace(/\/[^/]+$/, '/') : ''

  // Parse spine itemrefs — skip linear="no" navigation items
  const spineRefs = [...opfXml.matchAll(/<itemref\b[^>]*>/gi)]
    .filter(m => !/linear\s*=\s*["']no["']/i.test(m[0]))
    .map(m => m[0].match(/idref\s*=\s*["']([^"']+)["']/i)?.[1])
    .filter((id): id is string => !!id)

  // Build id → href map from manifest (attribute-order independent)
  const manifestItems: Record<string, string> = {}
  for (const m of opfXml.matchAll(/<item\b[^>]*>/gi)) {
    const el = m[0]
    const id = el.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1]
    const href = el.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]
    const mediaType = el.match(/media-type\s*=\s*["']([^"']+)["']/i)?.[1] ?? ''
    // Only include HTML/XHTML content items
    if (id && href && /html/i.test(mediaType)) manifestItems[id] = href
  }

  const parts: string[] = []
  for (const ref of spineRefs) {
    const href = manifestItems[ref]
    if (!href) continue
    // Resolve path: strip query/fragment, handle relative paths
    const cleanHref = href.split('?')[0].split('#')[0]
    const fullPath = opfDir + cleanHref
    const html = await (zip.file(fullPath) ?? zip.file(cleanHref))?.async('string')
    if (html) parts.push(htmlToText(html))
  }

  if (parts.length === 0) throw new Error('No readable spine items found')
  return parts.join('\n\n')
}

export async function extractEpubToDir(_base64Data: string, _destDir: string): Promise<void> {
  // Future use: extract epub files for epubjs local serving
}
