import { describe, expect, it } from "vitest"
import {
  GAL_Z,
  equatorialToCartesian,
  equatorialToGalactic,
  galacticAngles,
  galacticToEquatorial,
  galacticVectorIn,
} from "../../src/astro/coordinates"

const anglesOf = (raH: number, decDeg: number) => {
  const angles = galacticAngles(equatorialToGalactic(equatorialToCartesian(raH, decDeg, 10)))
  if (!angles) throw new Error("angles must exist for a non-zero vector")
  return angles
}

describe("coordinates", () => {
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

  it("expresses the galactic pole in either frame", () => {
    expect(galacticVectorIn("gal", 0, 1, 90).map((v) => Number(v.toFixed(9)))).toEqual([0, 0, 1])
    galacticVectorIn("eq", 0, 1, 90).forEach((value, i) =>
      expect(value).toBeCloseTo(GAL_Z[i] ?? NaN, 9),
    )
  })

  it("returns null angles for the origin", () => {
    expect(galacticAngles([0, 0, 0])).toBeNull()
  })
})
