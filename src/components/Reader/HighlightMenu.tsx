import { useEffect, useRef } from 'react'

interface Props {
  x: number
  y: number
  selectedText: string
  onHighlight: (color: string) => void
  onNote: () => void
  onClose: () => void
}

const COLORS = ['#ffeb3b', '#4caf50', '#f44336', '#2196f3']

export default function HighlightMenu({ x, y, onHighlight, onNote, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-30 rounded-2xl shadow-2xl border px-3 py-2 flex items-center gap-2"
      style={{ left: Math.min(x, window.innerWidth - 220), top: Math.max(y - 56, 8), backgroundColor: 'var(--reader-bg)', borderColor: 'var(--border)' }}
    >
      {COLORS.map(c => (
        <button
          key={c}
          className="w-7 h-7 rounded-full border-2 border-white shadow active:scale-90 transition-transform"
          style={{ backgroundColor: c }}
          onClick={() => onHighlight(c)}
        />
      ))}
      <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }} />
      <button onClick={onNote} className="text-xs font-medium px-1" style={{ color: 'var(--reader-fg)' }}>Note</button>
    </div>
  )
}
