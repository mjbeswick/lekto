import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Collection } from '../types'
import {
  getAllCollections,
  insertCollection,
  updateCollection,
  deleteCollection,
} from '../db/bookcases'

interface CollectionState {
  collections: Collection[]
  selectedId: string | null
  loading: boolean
  loadCollections: () => Promise<void>
  addCollection: (name: string) => Promise<void>
  renameCollection: (id: string, name: string) => Promise<void>
  removeCollection: (id: string) => Promise<void>
  selectCollection: (id: string | null) => void
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  selectedId: null,
  loading: false,

  loadCollections: async () => {
    set({ loading: true })
    const collections = await getAllCollections()
    set({ collections, loading: false })
  },

  addCollection: async (name) => {
    const { collections } = get()
    const collection: Collection = {
      id: uuidv4(),
      name,
      createdAt: Date.now(),
      order: collections.length,
    }
    await insertCollection(collection)
    set((s) => ({ collections: [...s.collections, collection] }))
  },

  renameCollection: async (id, name) => {
    const updatedCollection = await updateCollection(id, { name })
    if (!updatedCollection) return
    set((s) => ({
      collections: s.collections.map((bc) => (bc.id === id ? updatedCollection : bc)),
    }))
  },

  removeCollection: async (id) => {
    await deleteCollection(id)
    set((s) => ({
      collections: s.collections.filter((bc) => bc.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }))
  },

  selectCollection: (id) => {
    set({ selectedId: id })
  },
}))
