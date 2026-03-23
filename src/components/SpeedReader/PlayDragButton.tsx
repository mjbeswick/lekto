import { useRef, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons'

interface Props {
  playing: boolean
  wpm: number
  onToggle: () => void
  onPlay: () => void
  onPause: () => void
  onWpmChange: (wpm: number) => void
}

const WPM_SENSITIVITY = 2 // px per 1 WPM
const HOLD_THRESHOLD = 150 // ms before a press becomes a hold

export default function PlayDragButton({ playing, wpm, onToggle, onPlay, onPause, onWpmChange }: Props) {
  const touchStartRef = useRef<{ y: number; time: number; wpm: number } | null>(null)
  const isDraggingRef = useRef(false)
  const isHoldingRef = useRef(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wpmRef = useRef(wpm)
  wpmRef.current = wpm

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    touchStartRef.current = { y: touch.clientY, time: Date.now(), wpm: wpmRef.current }
    isDraggingRef.current = false
    isHoldingRef.current = false
    // After hold threshold, start playing
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true
      onPlay()
    }, HOLD_THRESHOLD)
  }, [onPlay])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!touchStartRef.current) return
    const touch = e.touches[0]
    const deltaY = touchStartRef.current.y - touch.clientY
    if (Math.abs(deltaY) > 8) {
      isDraggingRef.current = true
      if (!isHoldingRef.current) {
        clearHoldTimer()
        isHoldingRef.current = true
        onPlay()
      }
      const wpmDelta = Math.round(deltaY / WPM_SENSITIVITY)
      onWpmChange(Math.max(60, Math.min(2000, touchStartRef.current.wpm + wpmDelta)))
    }
  }, [onPlay, onWpmChange, clearHoldTimer])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    clearHoldTimer()
    const wasTap = !isHoldingRef.current && !isDraggingRef.current
    touchStartRef.current = null
    isDraggingRef.current = false
    isHoldingRef.current = false
    // Tap = toggle; hold/drag release = pause
    if (wasTap) onToggle()
    else onPause()
  }, [onToggle, onPause, clearHoldTimer])

  const handleTouchCancel = useCallback(() => {
    clearHoldTimer()
    touchStartRef.current = null
    isDraggingRef.current = false
    isHoldingRef.current = false
    onPause()
  }, [onPause, clearHoldTimer])

  // Mouse fallback for browser testing
  const handleMouseDown = useCallback(() => {
    touchStartRef.current = { y: 0, time: Date.now(), wpm: wpmRef.current }
    isDraggingRef.current = false
    isHoldingRef.current = false
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true
      onPlay()
    }, HOLD_THRESHOLD)
  }, [onPlay])

  const handleMouseUp = useCallback(() => {
    clearHoldTimer()
    const wasTap = !isHoldingRef.current && !isDraggingRef.current
    touchStartRef.current = null
    isDraggingRef.current = false
    isHoldingRef.current = false
    if (wasTap) onToggle()
    else onPause()
  }, [onToggle, onPause, clearHoldTimer])

  return (
    <button
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors select-none touch-none
        ${playing ? 'bg-orange-500' : 'bg-gray-800 dark:bg-gray-700'}`}
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      aria-label={playing ? 'Pause' : 'Play'}
    >
      <span className="text-white pointer-events-none">
        <FontAwesomeIcon icon={playing ? faPause : faPlay} size="2x" />
      </span>
    </button>
  )
}
