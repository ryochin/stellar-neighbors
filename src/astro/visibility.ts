import type { Star, Vec3 } from "../catalog/types"

export const CUBE_HALF_LY = 50
export const CUBE_SPAN_LY = CUBE_HALF_LY * 2
// The catalog covers twice this radius, so any allowed observer still sees a fully populated cube.
export const MAX_OBSERVER_DISTANCE_LY = Math.sqrt(3) * CUBE_HALF_LY
export const DEFAULT_MAX_RADIUS_LY = 87
const CUBE_EPSILON = 1e-5

/** Galactic position of `star` relative to `observer`, ly. */
export function relativePosition(star: Star, observer: Star): Vec3 {
  const p = star.gal
  const o = observer.gal
  return [p[0] - o[0], p[1] - o[1], p[2] - o[2]]
}

export function observerDistance(star: Star, observer: Star): number {
  return Math.hypot(...relativePosition(star, observer))
}

export function isInCube(star: Star, observer: Star): boolean {
  return relativePosition(star, observer).every((v) => Math.abs(v) <= CUBE_HALF_LY + CUBE_EPSILON)
}

export function canObserveFrom(star: Star): boolean {
  return star.distLy <= MAX_OBSERVER_DISTANCE_LY + 0.001
}

export function selectActiveStars(stars: Star[], observer: Star, maxRadius: number): Star[] {
  return stars.filter(
    (star) => observerDistance(star, observer) <= maxRadius && isInCube(star, observer),
  )
}
