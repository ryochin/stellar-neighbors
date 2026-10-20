import { describe, expect, it } from "vitest"
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
    expect(isInCube(near, sun, "gal")).toBe(true)
    expect(isInCube(far, sun, "gal")).toBe(false)
    const shifted = makeStarFromGal("shifted", [30, 0, 0])
    expect(isInCube(far, shifted, "gal")).toBe(true)
    expect(observerDistance(far, shifted)).toBeCloseTo(30, 9)
  })

  it("returns observer-relative positions", () => {
    const shifted = makeStarFromGal("shifted", [30, 0, 0])
    expect(relativePosition(far, shifted, "gal").map((v) => Math.round(v))).toEqual([30, 0, 0])
  })

  it("applies both the radius and the cube", () => {
    expect(selectActiveStars([sun, near, far, corner], sun, "gal", 60)).toEqual([sun, near])
    expect(selectActiveStars([sun, near, far, corner], sun, "gal", 87)).toEqual([sun, near, corner])
  })

  it("uses the cube of the selected frame", () => {
    const eqOnly = makeStar("eqOnly", [49, 49, 0])
    expect(isInCube(eqOnly, sun, "eq")).toBe(true)
    expect(isInCube(eqOnly, sun, "gal")).toBe(false)
  })

  it("limits observers to the half-diagonal of the cube", () => {
    expect(canObserveFrom(makeStarFromGal("a", [86.6, 0, 0]))).toBe(true)
    expect(canObserveFrom(makeStarFromGal("b", [86.7, 0, 0]))).toBe(false)
  })
})
