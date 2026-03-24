import { Capacitor } from '@capacitor/core'

export type Platform = 'capacitor' | 'electrobun' | 'web'

export function getPlatform(): Platform {
  if ((window as any).__LEKTO_PLATFORM__ === 'electrobun') return 'electrobun'
  if (Capacitor.isNativePlatform()) return 'capacitor'
  return 'web'
}

export const isCapacitor  = () => getPlatform() === 'capacitor'
export const isElectrobun = () => getPlatform() === 'electrobun'
export const isWeb        = () => getPlatform() === 'web'
