import { Preferences } from '@capacitor/preferences'
import type { Collection } from '../types'

const KEY = 'lekto.collections'

export async function getAllCollections(): Promise<Collection[]> {
  const { value } = await Preferences.get({ key: KEY })
  if (!value) return []
  try { return JSON.parse(value) as Collection[] } catch { return [] }
}

export async function insertCollection(collection: Collection): Promise<void> {
  const collections = await getAllCollections()
  collections.push(collection)
  collections.sort((a, b) => a.order - b.order)
  await Preferences.set({ key: KEY, value: JSON.stringify(collections) })
}

export async function updateCollection(id: string, patch: Partial<Collection>): Promise<Collection | null> {
  const collections = await getAllCollections()
  let updatedCollection: Collection | null = null
  const updated = collections.map(collection => {
    if (collection.id !== id) return collection
    updatedCollection = { ...collection, ...patch }
    return updatedCollection
  })
  if (!updatedCollection) return null
  await Preferences.set({ key: KEY, value: JSON.stringify(updated) })
  return updatedCollection
}

export async function deleteCollection(id: string): Promise<void> {
  const collections = await getAllCollections()
  await Preferences.set({ key: KEY, value: JSON.stringify(collections.filter(b => b.id !== id)) })
}
