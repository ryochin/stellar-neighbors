import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { toDegrees } from "../../src/astro/coordinates"
import { parseCatalog } from "../../src/catalog/loader"
import type { Star } from "../../src/catalog/types"
import { galacticPoleAngles, project } from "../../src/render/canvas2d/camera"

interface Reference {
  name: string
  /** Galactic longitude and latitude in degrees. */
  l: number
  b: number
  /** Parallax in milliarcseconds. */
  plxMas: number
}

// Independent reference values from SIMBAD (fetched 2026-10-21).
const REFERENCES: Reference[] = [
  { name: "Sirius", l: 227.23029126, b: -8.89028121, plxMas: 379.21 },
  { name: "Vega", l: 67.44820813, b: 19.23725227, plxMas: 130.23 },
  { name: "Altair", l: 47.74412569, b: -8.90918816, plxMas: 194.95 },
  { name: "Proxima Centauri", l: 313.9398620493784, b: -1.9271491330428, plxMas: 768.0665 },
  { name: "Alpha Centauri A", l: 315.73417134, b: -0.67965625, plxMas: 742.12 },
  { name: "Arcturus", l: 15.05005923, b: 69.11129459, plxMas: 88.83 },
  { name: "Procyon", l: 213.70224138, b: 13.01939682, plxMas: 284.56 },
  { name: "Barnard's Star", l: 31.0087027177046, b: 14.0626510150033, plxMas: 546.9759 },
  { name: "Fomalhaut", l: 20.48814538, b: -64.90960178, plxMas: 129.81 },
  { name: "Pollux", l: 192.22928777, b: 23.4062689, plxMas: 96.54 },
  { name: "Castor", l: 187.44099817, b: 22.47926806, plxMas: 64.12 },
]

const LY_PER_PARSEC = 3.26156
const ANGLE_TOLERANCE_DEG = 0.01
// HYG and SIMBAD take parallaxes from different sources (Alpha Centauri differs by about 1.7%).
const DISTANCE_TOLERANCE = 0.02

const catalogPath = new URL("../../src/catalog/data/stars.json", import.meta.url)
const stars: Star[] = parseCatalog(JSON.parse(readFileSync(catalogPath, "utf8"))).stars

const distanceLy = (ref: Reference): number => (1000 / ref.plxMas) * LY_PER_PARSEC
const angleDiffDeg = (a: number, b: number): number => ((a - b + 540) % 360) - 180

function findStar(name: string): Star {
  const star = stars.find((s) => s.name === name)
  if (!star) throw new Error(`${name} is missing from the catalog`)
  return star
}

describe("shipped catalog against SIMBAD", () => {
  it.each(REFERENCES)("places $name at its galactic longitude and latitude", (ref) => {
    const star = findStar(ref.name)
    expect(Math.abs(angleDiffDeg(star.l ?? NaN, ref.l))).toBeLessThan(ANGLE_TOLERANCE_DEG)
    expect(Math.abs((star.b ?? NaN) - ref.b)).toBeLessThan(ANGLE_TOLERANCE_DEG)
  })

  it.each(REFERENCES)("puts $name at its distance from the Sun", (ref) => {
    const star = findStar(ref.name)
    expect(Math.hypot(...star.gal)).toBeCloseTo(star.distLy, 9)
    expect(Math.abs(star.distLy / distanceLy(ref) - 1)).toBeLessThan(DISTANCE_TOLERANCE)
  })
})

describe("top-down view against SIMBAD", () => {
  const viewport = { width: 1000, height: 800 }
  const angles = galacticPoleAngles()
  const origin = project(angles, viewport, [0, 0, 0])
  // min(1000 / 140, 800 / 144) * zoom
  const scale = (800 / 144) * angles.zoom

  it.each(REFERENCES)("draws $name at its longitude and in-plane distance", (ref) => {
    const p = project(angles, viewport, findStar(ref.name).gal)
    const dx = p.x - origin.x
    const dy = origin.y - p.y
    // The galactic center (l = 0°) points to the left of the screen.
    const screenAngleDeg = toDegrees(Math.atan2(dy, dx))
    expect(Math.abs(angleDiffDeg(screenAngleDeg, ref.l + 180))).toBeLessThan(ANGLE_TOLERANCE_DEG)
    const inPlaneLy = Math.hypot(dx, dy) / (scale * p.f)
    const expectedLy = distanceLy(ref) * Math.cos((ref.b * Math.PI) / 180)
    expect(Math.abs(inPlaneLy / expectedLy - 1)).toBeLessThan(DISTANCE_TOLERANCE)
  })
})
