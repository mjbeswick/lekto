import { getOrpIndex } from '../../utils/textTokenizer'

interface Props {
  words: string[]
  fontSize?: number
  showTicks?: boolean
}

function SingleWord({ word, fontSize, showOrp, showTicks }: {
  word: string
  fontSize: number
  showOrp: boolean
  showTicks?: boolean
}) {
  const orpIdx = showOrp ? getOrpIndex(word) : -1
  return (
    <span className="font-serif tracking-wide" style={{ fontSize, lineHeight: 1 }}>
      {word.split('').map((ch, i) =>
        i === orpIdx ? (
          <span key={i} className="relative inline-block" style={{ color: '#f97316' }}>
            {ch}
            {showTicks && (
              <>
                <span className="absolute block -top-5 h-4 w-0.5 bg-orange-400 opacity-70"
                  style={{ left: '50%', transform: 'translateX(-50%)' }} />
                <span className="absolute block -bottom-5 h-4 w-0.5 bg-orange-400 opacity-70"
                  style={{ left: '50%', transform: 'translateX(-50%)' }} />
              </>
            )}
          </span>
        ) : (
          <span key={i} style={{ color: 'var(--reader-fg)' }}>{ch}</span>
        )
      )}
    </span>
  )
}

export default function RsvpChunk({ words, fontSize = 52, showTicks = false }: Props) {
  if (words.length === 0) return null

  // Scale font size down as total characters grow so chunk fits on screen
  const totalChars = words.reduce((sum, w, i) => sum + w.length + (i > 0 ? 1 : 0), 0)
  const scaledSize = words.length === 1
    ? fontSize
    : Math.min(fontSize, Math.max(22, Math.round(300 / totalChars)))

  return (
    <div className="flex items-baseline flex-wrap justify-center gap-x-[0.3em] gap-y-1 select-none" aria-live="off">
      {words.map((word, i) => (
        <SingleWord
          key={i}
          word={word}
          fontSize={scaledSize}
          showOrp
          showTicks={i === 0 && showTicks}
        />
      ))}
    </div>
  )
}
