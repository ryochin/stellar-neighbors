import { describe, expect, it } from "vitest"
import { NORTH_CELESTIAL_POLE, dot, equatorialToCartesian } from "../../src/astro/coordinates"
import {
  canObserveFrom,
  isInCube,
  observerDistance,
  relativePosition,
  selectActiveStars,
} from "../../src/astro/visibility"
import { makeStar, makeStarFromGal } from "../helpers"

const sun = makeStarFromGal("sun", [0, 0, 0])
const near = makeStarFromGal("near", [40, 0, 0])
const far = makeStarFromGal("far", [60, 0, 0])
const corner = makeStarFromGal("corner", [40, 40, 40])

describe("visibility", () => {
  it("tests cube membership relative to the observer", () => {
    expect(isInCube(near, sun)).toBe(true)
    expect(isInCube(far, sun)).toBe(false)
    const shifted = makeStarFromGal("shifted", [30, 0, 0])
    expect(isInCube(far, shifted)).toBe(true)
    expect(observerDistance(far, shifted)).toBeCloseTo(30, 9)
  })

  it("returns observer-relative positions", () => {
    const shifted = makeStarFromGal("shifted", [30, 0, 0])
    expect(relativePosition(far, shifted).map((v) => Math.round(v))).toEqual([30, 0, 0])
  })

  it("applies both the radius and the cube", () => {
    expect(selectActiveStars([sun, near, far, corner], sun, 60)).toEqual([sun, near])
    expect(selectActiveStars([sun, near, far, corner], sun, 87)).toEqual([sun, near, corner])
  })

  it("limits observers to the half-diagonal of the cube", () => {
    expect(canObserveFrom(makeStarFromGal("a", [86.6, 0, 0]))).toBe(true)
    expect(canObserveFrom(makeStarFromGal("b", [86.7, 0, 0]))).toBe(false)
  })

  // The equator overlay draws the plane dot(NCP, p) = -observer.eq[2] in observer-relative space.
  it.each([
    ["north", [3, -4, 12]],
    ["south", [-2, 1, -9]],
  ] as const)("keeps equatorial stars on the equator plane seen from %s of it", (_, eq) => {
    const observer = makeStar("observer", [...eq])
    for (const raH of [0, 5, 13, 21]) {
      const onEquator = makeStar(`eq${raH}`, equatorialToCartesian(raH, 0, 30))
      const p = relativePosition(onEquator, observer)
      expect(dot(NORTH_CELESTIAL_POLE, p)).toBeCloseTo(-observer.eq[2], 9)
    }
  })
})
