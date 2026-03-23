/** Tokenize a string into words for RSVP, preserving sentence/paragraph boundaries */
export interface Token {
  word: string
  isSentenceEnd: boolean
  isClauseEnd: boolean
  isParagraphEnd: boolean
  delayMultiplier: number  // pre-computed per spec punctuation table
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  // Split into paragraphs first so we can mark paragraph-end tokens correctly
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const rawWords = paragraphs[pi].replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
    for (let wi = 0; wi < rawWords.length; wi++) {
      const raw = rawWords[wi]
      const isSentenceEnd = /[.!?]['")\]]*$/.test(raw)
      const endsWithColon = /[;:]['")\]]*$/.test(raw) && !isSentenceEnd
      const endsWithComma = /,['")\]]*$/.test(raw) && !isSentenceEnd
      const isClauseEnd = endsWithColon || endsWithComma
      const isParagraphEnd = wi === rawWords.length - 1 && pi < paragraphs.length - 1

      const delayMultiplier = isParagraphEnd ? 2.0
        : isSentenceEnd ? 1.6
        : endsWithColon ? 1.5
        : endsWithComma ? 1.3
        : 1.0

      tokens.push({
        word: raw.replace(/\n/g, ''),
        isSentenceEnd,
        isClauseEnd,
        isParagraphEnd,
        delayMultiplier,
      })
    }
  }

  return tokens.length > 0 ? tokens : [{ word: '', isSentenceEnd: false, isClauseEnd: false, isParagraphEnd: false, delayMultiplier: 1 }]
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

/** Get pivot (ORP) index in a word — ~35% in per spec */
export function getOrpIndex(word: string): number {
  const clean = word.replace(/[^a-zA-Z0-9]/g, '')
  if (clean.length <= 1) return 0
  return Math.max(0, Math.floor(clean.length * 0.35) - 1)
}
