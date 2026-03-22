import { getOrpIndex } from '../../utils/textTokenizer'

interface Props {
  word: string
  fontSize?: number
}

export default function RsvpWord({ word, fontSize = 52 }: Props) {
  const orpIdx = getOrpIndex(word)

  return (
    <div
      className="font-serif select-none tracking-wide"
      style={{ fontSize, lineHeight: 1 }}
      aria-live="off"
    >
      {word.split('').map((ch, i) => (
        <span
          key={i}
          style={{ color: i === orpIdx ? '#f97316' : 'var(--reader-fg)' }}
        >
          {ch}
        </span>
      ))}
    </div>
  )
}
