import JSZip from 'jszip'

export interface Fb2Meta {
  title: string
  author: string
  coverBase64?: string
}

async function getXmlString(data: ArrayBuffer): Promise<string> {
  // FB2 files are sometimes distributed as .fb2.zip (single-file zip)
  try {
    const zip = await JSZip.loadAsync(data)
    const files = Object.values(zip.files).filter(f => !f.dir && f.name.endsWith('.fb2'))
    if (files.length > 0) {
      return await files[0].async('string')
    }
  } catch {
    // not a zip — fall through
  }
  return new TextDecoder('utf-8').decode(data)
}

function parseXml(xmlString: string): Document {
  return new DOMParser().parseFromString(xmlString, 'application/xml')
}

export async function parseFb2Meta(data: ArrayBuffer): Promise<Fb2Meta> {
  const xmlString = await getXmlString(data)
  const doc = parseXml(xmlString)

  const titleEl = doc.querySelector('description > title-info > book-title')
  const title = titleEl?.textContent?.trim() ?? 'Unknown'

  const firstNameEl = doc.querySelector('description > title-info > author > first-name')
  const lastNameEl = doc.querySelector('description > title-info > author > last-name')
  const firstName = firstNameEl?.textContent?.trim() ?? ''
  const lastName = lastNameEl?.textContent?.trim() ?? ''
  const author = [firstName, lastName].filter(Boolean).join(' ')

  let coverBase64: string | undefined
  const coverPageEl = doc.querySelector('description > title-info > coverpage > image')
  const coverHref = coverPageEl?.getAttribute('l:href') ?? coverPageEl?.getAttribute('xlink:href')
  if (coverHref) {
    const id = coverHref.replace(/^#/, '')
    const binaryEl = doc.querySelector(`binary[id="${id}"]`)
    if (binaryEl) {
      const contentType = binaryEl.getAttribute('content-type') ?? 'image/jpeg'
      const base64Data = binaryEl.textContent?.replace(/\s/g, '') ?? ''
      coverBase64 = `data:${contentType};base64,${base64Data}`
    }
  }

  return { title, author, coverBase64 }
}

export async function fb2ToHtml(data: ArrayBuffer): Promise<string> {
  const xmlString = await getXmlString(data)
  const doc = parseXml(xmlString)
  const body = doc.querySelector('body')
  if (!body) return '<p>No content found.</p>'

  function convertNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? ''
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const el = node as Element
    const tag = el.tagName.toLowerCase()
    const children = Array.from(el.childNodes).map(convertNode).join('')

    switch (tag) {
      case 'section':
        return `<div class="section">${children}</div>`
      case 'title':
        return `<h2>${children}</h2>`
      case 'subtitle':
        return `<h3>${children}</h3>`
      case 'p':
        return `<p>${children}</p>`
      case 'emphasis':
        return `<em>${children}</em>`
      case 'strong':
        return `<strong>${children}</strong>`
      case 'strikethrough':
        return `<s>${children}</s>`
      case 'code':
        return `<code>${children}</code>`
      case 'epigraph':
        return `<blockquote>${children}</blockquote>`
      case 'cite':
        return `<blockquote>${children}</blockquote>`
      case 'poem':
        return `<pre>${children}</pre>`
      case 'stanza':
        return `<p>${children}</p>`
      case 'v':
        return `${children}<br/>`
      case 'a': {
        const href = el.getAttribute('l:href') ?? el.getAttribute('xlink:href') ?? '#'
        return href.startsWith('#')
          ? children
          : `<a href="${href}" target="_blank" rel="noopener">${children}</a>`
      }
      case 'image':
        return '' // skip inline images
      default:
        return children
    }
  }

  return Array.from(body.childNodes).map(convertNode).join('')
}

export async function extractFb2Text(data: ArrayBuffer): Promise<string> {
  const xmlString = await getXmlString(data)
  const doc = parseXml(xmlString)
  const body = doc.querySelector('body')
  if (!body) return ''

  return (body.textContent ?? '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
