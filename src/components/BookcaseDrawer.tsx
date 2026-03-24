import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faPen, faTrash, faPlus, faBookOpen, faTimes } from '@fortawesome/free-solid-svg-icons'
import { useCollectionStore } from '../store/bookcaseStore'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CollectionDrawer({ open, onClose }: Props) {
  const { collections, selectedId, addCollection, renameCollection, removeCollection, selectCollection } = useCollectionStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId !== null) {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }
  }, [editingId])

  function startEditing(id: string, currentName: string) {
    setEditingId(id)
    setEditingName(currentName)
  }

  async function commitRename() {
    if (editingId === null) return
    const trimmed = editingName.trim()
    if (trimmed) {
      await renameCollection(editingId, trimmed)
    }
    setEditingId(null)
    setEditingName('')
  }

  async function handleNewCollection() {
    const name = window.prompt('Collection name:')
    if (!name?.trim()) return
    await addCollection(name.trim())
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? Books in this collection will not be deleted.`)) return
    await removeCollection(id)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 left-0 h-full z-50 w-72 flex flex-col transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-fg)', borderRight: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 flex-shrink-0 border-b"
          style={{ borderColor: 'var(--border)', paddingTop: 'calc(1rem + var(--safe-top))', paddingBottom: '1rem' }}
        >
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBookOpen} style={{ color: 'var(--text-muted)' }} />
            <span className="font-bold text-base tracking-tight">Collections</span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity active:opacity-50"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}
            aria-label="Close drawer"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {/* All Books */}
          <button
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm font-medium border-b transition-opacity active:opacity-70"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: selectedId === null ? 'var(--surface-2)' : undefined,
            }}
            onClick={() => { selectCollection(null); onClose() }}
          >
            <span className="w-4 flex-shrink-0 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
              {selectedId === null && <FontAwesomeIcon icon={faCheck} />}
            </span>
            <span className="flex-1 truncate">All Books</span>
          </button>

          {/* Collection items */}
          {collections
            .slice()
            .sort((a, b) => a.order - b.order)
            .map(bc => (
              <div
                key={bc.id}
                className="flex items-center gap-2 px-4 py-3 border-b"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: selectedId === bc.id ? 'var(--surface-2)' : undefined,
                }}
              >
                {/* Check / tap to select */}
                <button
                  className="flex-shrink-0 w-4 flex items-center justify-center text-xs transition-opacity active:opacity-50"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => { selectCollection(bc.id); onClose() }}
                  aria-label={`Select ${bc.name}`}
                >
                  {selectedId === bc.id && <FontAwesomeIcon icon={faCheck} />}
                </button>

                {/* Name or edit input */}
                {editingId === bc.id ? (
                  <input
                    ref={editInputRef}
                    className="flex-1 min-w-0 text-sm bg-transparent border-b outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--reader-fg)' }}
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') { setEditingId(null); setEditingName('') }
                    }}
                    onBlur={commitRename}
                  />
                ) : (
                  <button
                    className="flex-1 min-w-0 text-left text-sm font-medium truncate transition-opacity active:opacity-70"
                    onClick={() => { selectCollection(bc.id); onClose() }}
                  >
                    {bc.name}
                  </button>
                )}

                {/* Edit button */}
                {editingId !== bc.id && (
                  <button
                    className="flex-shrink-0 p-1 rounded-lg transition-opacity active:opacity-50"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={e => { e.stopPropagation(); startEditing(bc.id, bc.name) }}
                    aria-label={`Rename ${bc.name}`}
                  >
                    <FontAwesomeIcon icon={faPen} className="text-xs" />
                  </button>
                )}

                {/* Delete button */}
                {editingId !== bc.id && (
                  <button
                    className="flex-shrink-0 p-1 rounded-lg transition-opacity active:opacity-50"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={e => { e.stopPropagation(); handleDelete(bc.id, bc.name) }}
                    aria-label={`Delete ${bc.name}`}
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  </button>
                )}
              </div>
            ))}
        </div>

        {/* Footer: New Collection */}
        <div
          className="flex-shrink-0 p-4 border-t"
          style={{ borderColor: 'var(--border)', paddingBottom: 'calc(1rem + var(--safe-bottom, 0px))' }}
        >
          <button
            onClick={handleNewCollection}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold transition-opacity active:opacity-70"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--reader-fg)' }}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            New Collection
          </button>
        </div>
      </div>
    </>
  )
}
