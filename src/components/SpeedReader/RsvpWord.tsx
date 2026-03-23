import { getOrpIndex } from '../../utils/textTokenizer'

interface Props {
  word: string
  fontSize?: number
}

export default function RsvpWord({ word, fontSize = 52 }: Props) {
  const orpIdx = getOrpIndex(word)
  const before = word.slice(0, orpIdx)
  const orpChar = word[orpIdx] ?? ''
  const after = word.slice(orpIdx + 1)

  return (
    <div
      className="font-serif select-none tracking-wide w-full flex"
      style={{ fontSize, lineHeight: 1 }}
      aria-live="off"
    >
      <span style={{ flex: 1, textAlign: 'right', color: 'var(--reader-fg)' }}>{before}</span>
      <span style={{ color: 'var(--reader-accent)' }}>{orpChar}</span>
      <span style={{ flex: 1, textAlign: 'left', color: 'var(--reader-fg)' }}>{after}</span>
    </div>
  )
}
