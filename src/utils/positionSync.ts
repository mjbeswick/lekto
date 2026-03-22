/**
 * Shared reading position (0.0–1.0 fraction through the text).
 * Updated by both PaginatedReader and SpeedReaderView so switching
 * between modes resumes from approximately the same place.
 * Module-level so it doesn't trigger re-renders and works without
 * React context coordination.
 */
let _fraction = 0

export function getReadingPosition(): number {
  return _fraction
}

export function setReadingPosition(fraction: number): void {
  _fraction = Math.max(0, Math.min(1, fraction))
}
