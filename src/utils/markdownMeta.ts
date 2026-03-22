export interface MdMeta {
  title: string
  author: string
}

/** Extract title/author from YAML frontmatter or first heading */
export function parseMdMeta(content: string): MdMeta {
  // YAML frontmatter
  const fm = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (fm) {
    const block = fm[1]
    const title = block.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1]?.trim()
    const author = block.match(/^author:\s*['"]?(.+?)['"]?\s*$/m)?.[1]?.trim()
    if (title) return { title, author: author ?? '' }
  }
  // First h1
  const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return { title: h1 ?? 'Untitled', author: '' }
}
