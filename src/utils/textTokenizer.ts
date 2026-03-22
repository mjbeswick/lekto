/** Tokenize a string into words for RSVP, preserving sentence boundaries */
export interface Token {
  word: string
  isSentenceEnd: boolean
  isClauseEnd: boolean
  isParagraphEnd: boolean
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  const rawWords = text.replace(/\s+/g, ' ').trim().split(' ')
  for (const raw of rawWords) {
    if (!raw) continue
    const isSentenceEnd = /[.!?]['")\]]*$/.test(raw)
    const isClauseEnd = !isSentenceEnd && /[,;:]['")\]]*$/.test(raw)
    const isParagraphEnd = raw.includes('\n\n')
    tokens.push({ word: raw.replace(/\n/g, ''), isSentenceEnd, isClauseEnd, isParagraphEnd })
  }
  return tokens
}

/** Strip markdown syntax for plain-text extraction */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/!\[.*?\]\(.+?\)/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/---/g, '')
    .trim()
}

/** Get pivot (ORP) index in a word — roughly 30% in, min 1 */
export function getOrpIndex(word: string): number {
  const clean = word.replace(/[^a-zA-Z0-9]/g, '')
  if (clean.length <= 1) return 0
  return Math.max(0, Math.floor(clean.length * 0.3) - 1)
}
