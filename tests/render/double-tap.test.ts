import { describe, expect, it } from "vitest"
import {
  DOUBLE_TAP_MS,
  DOUBLE_TAP_PX,
  isDoubleTap,
  type Tap,
} from "../../src/render/canvas2d/double-tap"

const first: Tap<string> = { time: 1000, x: 100, y: 100, target: "sirius" }
const second = (changes: Partial<Tap<string>>): Tap<string> => ({
  ...first,
  time: first.time + 200,
  ...changes,
})

describe("isDoubleTap", () => {
  it("pairs a quick second tap on the same star", () => {
    expect(isDoubleTap(first, second({ x: 110, y: 95 }))).toBe(true)
  })

  it("needs an earlier tap", () => {
    expect(isDoubleTap(null, first)).toBe(false)
  })

  it("rejects a tap on another star", () => {
    expect(isDoubleTap(first, second({ target: "vega" }))).toBe(false)
  })

  it("rejects a slow second tap", () => {
    expect(isDoubleTap(first, second({ time: first.time + DOUBLE_TAP_MS }))).toBe(true)
    expect(isDoubleTap(first, second({ time: first.time + DOUBLE_TAP_MS + 1 }))).toBe(false)
  })

  it("rejects a second tap far from the first", () => {
    expect(isDoubleTap(first, second({ x: first.x + DOUBLE_TAP_PX }))).toBe(true)
    expect(isDoubleTap(first, second({ x: first.x + DOUBLE_TAP_PX + 1 }))).toBe(false)
  })
})
