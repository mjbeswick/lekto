import { useState, useEffect, useCallback } from 'react'

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const enter = useCallback(async () => {
    try { await document.documentElement.requestFullscreen() } catch {}
  }, [])

  const exit = useCallback(async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen() } catch {}
  }, [])

  const toggle = useCallback(() => {
    if (document.fullscreenElement) exit()
    else enter()
  }, [enter, exit])

  return { isFullscreen, toggle, enter, exit }
}
