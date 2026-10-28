import { describe, expect, it } from "vitest"
import { starSizeScales } from "../../src/render/canvas2d/draw"

describe("starSizeScales", () => {
  it("shrinks stars and halos on a phone-sized stage", () => {
    expect(starSizeScales({ width: 390, height: 549 })).toEqual({ star: 0.75, halo: 0.7 })
  })

  it("keeps the full size from a 700px short side", () => {
    expect(starSizeScales({ width: 1080, height: 700 })).toEqual({ star: 1, halo: 1 })
    expect(starSizeScales({ width: 1600, height: 1000 })).toEqual({ star: 1, halo: 1 })
  })

  it("scales linearly in between and never below the small-stage values", () => {
    const mid = starSizeScales({ width: 545, height: 900 })
    expect(mid.star).toBeCloseTo(0.875, 9)
    expect(mid.halo).toBeCloseTo(0.85, 9)
    expect(starSizeScales({ width: 320, height: 480 })).toEqual({ star: 0.75, halo: 0.7 })
  })
})
