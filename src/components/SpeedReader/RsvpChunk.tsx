import { getOrpIndex } from '../../utils/textTokenizer'

const RSVP_FONT = 'Inter, system-ui, -apple-system, sans-serif'

interface Props {
  words: string[]
  fontSize?: number
  showTicks?: boolean
}

/**
 * Single word with ORP horizontal alignment.
 * The ORP character is pinned at the horizontal center of the container;
 * pre-ORP text grows leftward, post-ORP text grows rightward.
 */
function SingleWord({ word, fontSize, showTicks }: {
  word: string
  fontSize: number
  showTicks?: boolean
}) {
  const orpIdx = getOrpIndex(word)
  const pre  = word.slice(0, orpIdx)
  const orp  = word[orpIdx] ?? word[0] ?? ''
  const post = word.slice(orpIdx + 1)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        width: '100%',
        fontFamily: RSVP_FONT,
        fontSize,
        fontWeight: 500,
        letterSpacing: '0.02em',
        lineHeight: 1,
      }}
    >
      {/* Pre-ORP: right-aligned so it butts up against the ORP char at center */}
      <div style={{ flex: 1, textAlign: 'right', color: 'var(--reader-fg)', whiteSpace: 'nowrap' }}>
        {pre}
      </div>

      {/* ORP character: always at center, bold + accent color */}
      <span
        style={{
          color: 'var(--reader-accent)',
          fontWeight: 700,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {orp}
        {showTicks && (
          <>
            <span
              style={{
                position: 'absolute',
                top: '-1.2em',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'block',
                width: 2,
                height: '0.9em',
                backgroundColor: 'var(--reader-accent)',
                opacity: 0.5,
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '-1.2em',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'block',
                width: 2,
                height: '0.9em',
                backgroundColor: 'var(--reader-accent)',
                opacity: 0.5,
              }}
            />
          </>
        )}
      </span>

      {/* Post-ORP: left-aligned from the ORP char */}
      <div style={{ flex: 1, textAlign: 'left', color: 'var(--reader-fg)', whiteSpace: 'nowrap' }}>
        {post}
      </div>
    </div>
  )
}

export default function RsvpChunk({ words, fontSize = 52, showTicks = false }: Props) {
  if (words.length === 0) return null

  if (words.length === 1) {
    return (
      <SingleWord word={words[0]} fontSize={fontSize} showTicks={showTicks} />
    )
  }

  // Multi-word chunk: center the group, scale font down to fit
  const totalChars = words.reduce((sum, w, i) => sum + w.length + (i > 0 ? 1 : 0), 0)
  const scaledSize = Math.min(fontSize, Math.max(22, Math.round(300 / totalChars)))

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '0 0.3em',
        fontFamily: RSVP_FONT,
        fontSize: scaledSize,
        fontWeight: 500,
        letterSpacing: '0.02em',
      }}
      aria-live="off"
    >
      {words.map((word, i) => {
        const orpIdx = getOrpIndex(word)
        return (
          <span key={i}>
            {word.split('').map((ch, ci) =>
              ci === orpIdx
                ? <span key={ci} style={{ color: 'var(--reader-accent)', fontWeight: 700 }}>{ch}</span>
                : <span key={ci} style={{ color: 'var(--reader-fg)' }}>{ch}</span>
            )}
          </span>
        )
      })}
    </div>
  )
}
