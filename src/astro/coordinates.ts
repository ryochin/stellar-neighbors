import type { Vec3 } from "../catalog/types"

// ESA Gaia DR3 rotation matrix rows: ICRS/J2000 equatorial -> Galactic.
export const GAL_X: Vec3 = [-0.0548755604162154, -0.873437090234885, -0.4838350155487132]
export const GAL_Y: Vec3 = [0.4941094278755837, -0.4448296299600112, 0.746982244497219]
export const GAL_Z: Vec3 = [-0.8676661490190047, -0.1980763734312015, 0.4559837761750669]

export const toRadians = (degrees: number): number => (degrees * Math.PI) / 180
export const toDegrees = (radians: number): number => (radians * 180) / Math.PI
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

export function equatorialToCartesian(raHours: number, decDeg: number, distance: number): Vec3 {
  const ra = (raHours * Math.PI) / 12
  const dec = toRadians(decDeg)
  return [
    distance * Math.cos(dec) * Math.cos(ra),
    distance * Math.cos(dec) * Math.sin(ra),
    distance * Math.sin(dec),
  ]
}

export function equatorialToGalactic(v: Vec3): Vec3 {
  return [dot(GAL_X, v), dot(GAL_Y, v), dot(GAL_Z, v)]
}

// Inverse rotation = transpose of the matrix above.
export function galacticToEquatorial(g: Vec3): Vec3 {
  return [
    GAL_X[0] * g[0] + GAL_Y[0] * g[1] + GAL_Z[0] * g[2],
    GAL_X[1] * g[0] + GAL_Y[1] * g[1] + GAL_Z[1] * g[2],
    GAL_X[2] * g[0] + GAL_Y[2] * g[1] + GAL_Z[2] * g[2],
  ]
}

export function galacticAngles(g: Vec3): { l: number; b: number } | null {
  if (g[0] === 0 && g[1] === 0 && g[2] === 0) return null
  const l = (toDegrees(Math.atan2(g[1], g[0])) + 360) % 360
  const b = toDegrees(Math.atan2(g[2], Math.hypot(g[0], g[1])))
  return { l, b }
}

/** Vector at galactic longitude/latitude and length `r`, in galactic coordinates. */
export function galacticVector(lDeg: number, r: number, bDeg = 0): Vec3 {
  const l = toRadians(lDeg)
  const b = toRadians(bDeg)
  return [r * Math.cos(b) * Math.cos(l), r * Math.cos(b) * Math.sin(l), r * Math.sin(b)]
}

/** North celestial pole (J2000) as a unit vector in galactic coordinates. */
export const NORTH_CELESTIAL_POLE: Vec3 = equatorialToGalactic([0, 0, 1])
