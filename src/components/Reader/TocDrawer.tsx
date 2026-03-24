import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import type { TocItem } from './EpubReader'

interface Props {
  toc: TocItem[]
  onSelect: (href: string) => void
  onClose: () => void
}

function TocNode({ item, onSelect }: { item: TocItem; onSelect: (href: string) => void }) {
  return (
    <li>
      <button
        className="w-full text-left py-3 px-4 border-b text-sm transition-opacity active:opacity-60"
        style={{ borderColor: 'var(--border)' }}
        onClick={() => onSelect(item.href)}
      >
        {item.label}
      </button>
      {item.subitems?.length ? (
        <ul className="pl-4">
          {item.subitems.map(sub => <TocNode key={sub.id} item={sub} onSelect={onSelect} />)}
        </ul>
      ) : null}
    </li>
  )
}

export default function TocDrawer({ toc, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black bg-opacity-40" onClick={onClose} />
      {/* Drawer */}
      <div className="w-72 h-full overflow-y-auto shadow-2xl" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)' }}>
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-base">Contents</h2>
          <button onClick={onClose} className="p-1 transition-opacity active:opacity-50" style={{ color: 'var(--text-muted)' }}><FontAwesomeIcon icon={faXmark} size="lg" /></button>
        </div>
        <ul>
          {toc.map(item => <TocNode key={item.id} item={item} onSelect={onSelect} />)}
        </ul>
      </div>
    </div>
  )
}
