import { describe, expect, it } from "vitest"
import {
  GAL_X,
  GAL_Y,
  GAL_Z,
  NORTH_CELESTIAL_POLE,
  equatorialToCartesian,
  equatorialToGalactic,
  galacticAngles,
  galacticToEquatorial,
  galacticVector,
  dot,
} from "../../src/astro/coordinates"
import type { Vec3 } from "../../src/catalog/types"

const anglesOf = (raH: number, decDeg: number) => {
  const angles = galacticAngles(equatorialToGalactic(equatorialToCartesian(raH, decDeg, 10)))
  if (!angles) throw new Error("angles must exist for a non-zero vector")
  return angles
}

describe("coordinates", () => {
  it("uses an orthonormal, right-handed rotation matrix", () => {
    const rows = [GAL_X, GAL_Y, GAL_Z]
    rows.forEach((a, i) =>
      rows.forEach((b, j) => expect(dot(a, b)).toBeCloseTo(i === j ? 1 : 0, 12)),
    )
    // X × Y = Z holds only for a right-handed frame.
    const cross: Vec3 = [
      GAL_X[1] * GAL_Y[2] - GAL_X[2] * GAL_Y[1],
      GAL_X[2] * GAL_Y[0] - GAL_X[0] * GAL_Y[2],
      GAL_X[0] * GAL_Y[1] - GAL_X[1] * GAL_Y[0],
    ]
    cross.forEach((value, i) => expect(value).toBeCloseTo(GAL_Z[i] ?? NaN, 12))
  })

  it("converts Sirius to its known galactic coordinates", () => {
    const { l, b } = anglesOf(6.752481, -16.716116)
    expect(l).toBeCloseTo(227.23, 1)
    expect(b).toBeCloseTo(-8.89, 1)
  })

  it("puts Sgr A* at the galactic center", () => {
    const { l, b } = anglesOf(17.761122, -29.007811)
    expect(Math.min(l, 360 - l)).toBeLessThan(0.1)
    expect(Math.abs(b)).toBeLessThan(0.1)
  })

  it("puts the north galactic pole at b = +90°", () => {
    expect(anglesOf(12.857299, 27.12825).b).toBeGreaterThan(89.99)
  })

  it("round-trips between equatorial and galactic frames", () => {
    const v = equatorialToCartesian(3.5, 42, 25)
    const back = galacticToEquatorial(equatorialToGalactic(v))
    back.forEach((value, i) => expect(value).toBeCloseTo(v[i] ?? NaN, 9))
  })

  it("builds vectors from galactic longitude and latitude", () => {
    expect(galacticVector(0, 1, 90).map((v) => Number(v.toFixed(9)))).toEqual([0, 0, 1])
    expect(galacticVector(90, 2).map((v) => Number(v.toFixed(9)))).toEqual([0, 2, 0])
  })

  it("places the north celestial pole at l = 122.93°, b = 27.13°", () => {
    expect(Math.hypot(...NORTH_CELESTIAL_POLE)).toBeCloseTo(1, 12)
    const angles = galacticAngles(NORTH_CELESTIAL_POLE)
    expect(angles?.l).toBeCloseTo(122.93, 2)
    expect(angles?.b).toBeCloseTo(27.13, 2)
  })

  it("returns null angles for the origin", () => {
    expect(galacticAngles([0, 0, 0])).toBeNull()
  })
})
