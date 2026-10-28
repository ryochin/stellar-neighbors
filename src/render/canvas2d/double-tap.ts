// iOS Safari does not fire dblclick for a double tap on the stage, so touch taps are paired here.
export const DOUBLE_TAP_MS = 350
export const DOUBLE_TAP_PX = 30

export interface Tap<T> {
  time: number
  x: number
  y: number
  target: T
}

/** A second tap on the same target, close in time and place, completes a double tap. */
export function isDoubleTap<T>(previous: Tap<T> | null, tap: Tap<T>): boolean {
  return (
    previous !== null &&
    previous.target === tap.target &&
    tap.time - previous.time <= DOUBLE_TAP_MS &&
    Math.hypot(tap.x - previous.x, tap.y - previous.y) <= DOUBLE_TAP_PX
  )
}
