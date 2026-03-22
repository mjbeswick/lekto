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
        className="w-full text-left py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-sm hover:bg-orange-50 dark:hover:bg-gray-800 active:bg-orange-100"
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
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-base">Contents</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><FontAwesomeIcon icon={faXmark} size="lg" /></button>
        </div>
        <ul>
          {toc.map(item => <TocNode key={item.id} item={item} onSelect={onSelect} />)}
        </ul>
      </div>
    </div>
  )
}
