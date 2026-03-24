import { Preferences } from '@capacitor/preferences'
import type { DirectorySource } from '../types'

const KEY = 'lekto.directories'

export async function getAllDirectories(): Promise<DirectorySource[]> {
  const { value } = await Preferences.get({ key: KEY })
  if (!value) return []
  try { return JSON.parse(value) as DirectorySource[] } catch { return [] }
}

export async function insertDirectory(dir: DirectorySource): Promise<void> {
  const dirs = await getAllDirectories()
  dirs.push(dir)
  await Preferences.set({ key: KEY, value: JSON.stringify(dirs) })
}

export async function updateDirectory(id: string, patch: Partial<DirectorySource>): Promise<DirectorySource | null> {
  const dirs = await getAllDirectories()
  let updated: DirectorySource | null = null
  const result = dirs.map(dir => {
    if (dir.id !== id) return dir
    updated = { ...dir, ...patch }
    return updated
  })
  if (!updated) return null
  await Preferences.set({ key: KEY, value: JSON.stringify(result) })
  return updated
}

export async function deleteDirectory(id: string): Promise<void> {
  const dirs = await getAllDirectories()
  await Preferences.set({ key: KEY, value: JSON.stringify(dirs.filter(d => d.id !== id)) })
}
