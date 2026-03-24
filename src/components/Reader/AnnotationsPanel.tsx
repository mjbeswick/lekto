import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import type { Highlight, Note } from '../../types'

interface Props {
  highlights: Highlight[]
  notes: Note[]
  onDeleteHighlight: (id: string) => void
  onClose: () => void
}

export default function AnnotationsPanel({ highlights, notes, onDeleteHighlight, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black bg-opacity-40" onClick={onClose} />
      <div className="w-80 h-full overflow-y-auto shadow-2xl flex flex-col" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
        <div className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold">Annotations</h2>
          <button onClick={onClose} className="p-1 transition-opacity active:opacity-50" style={{ color: 'var(--text-muted)' }}><FontAwesomeIcon icon={faXmark} size="lg" /></button>
        </div>

        {highlights.length === 0 && notes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm px-6 text-center" style={{ color: 'var(--text-muted)' }}>
            <p>No annotations yet.<br />Long-press text in the reader to highlight.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {highlights.length > 0 && (
              <section className="p-4">
                <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Highlights</h3>
                {highlights.map(h => (
                  <div key={h.id} className="mb-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1" style={{ borderLeft: `3px solid ${h.color}`, paddingLeft: 8 }}>
                        {h.text}
                      </p>
                      <button onClick={() => onDeleteHighlight(h.id)} className="p-1 flex-shrink-0 transition-opacity active:opacity-50" style={{ color: 'var(--text-muted)' }}><FontAwesomeIcon icon={faXmark} /></button>
                    </div>
                  </div>
                ))}
              </section>
            )}
            {notes.length > 0 && (
              <section className="p-4">
                <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Notes</h3>
                {notes.map(n => (
                  <div key={n.id} className="mb-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm">{n.text}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
