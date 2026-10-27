import { describe, expect, it } from "vitest"
import {
  LABEL_FADE_MS,
  advanceLabelFades,
  fadeElapsedMs,
} from "../../src/render/canvas2d/label-fade"

const ids = (...list: string[]): Set<string> => new Set<string>(list)

describe("advanceLabelFades", () => {
  it("fades a newly shown label in over LABEL_FADE_MS", () => {
    const half = advanceLabelFades(new Map(), ids("a"), ids("a"), LABEL_FADE_MS / 2)
    expect(half.opacities.get("a")).toBeCloseTo(0.5, 12)
    expect(half.animating).toBe(true)
    const almost = advanceLabelFades(half.opacities, ids("a"), ids("a"), LABEL_FADE_MS / 2 - 1)
    expect(almost.opacities.get("a")).toBeLessThan(1)
    expect(almost.animating).toBe(true)
    const full = advanceLabelFades(half.opacities, ids("a"), ids("a"), LABEL_FADE_MS / 2)
    expect(full.opacities.get("a")).toBe(1)
    expect(full.animating).toBe(false)
  })

  it("fades a hidden label out and drops it at 0", () => {
    const start = new Map([["a", 1]])
    const half = advanceLabelFades(start, ids(), ids("a"), LABEL_FADE_MS / 2)
    expect(half.opacities.get("a")).toBeCloseTo(0.5, 12)
    expect(half.animating).toBe(true)
    const almost = advanceLabelFades(half.opacities, ids(), ids("a"), LABEL_FADE_MS / 2 - 1)
    expect(almost.opacities.get("a")).toBeGreaterThan(0)
    const gone = advanceLabelFades(half.opacities, ids(), ids("a"), LABEL_FADE_MS / 2)
    expect(gone.opacities.has("a")).toBe(false)
    expect(gone.animating).toBe(false)
  })

  it("turns a fading-out label back from where it is", () => {
    const fading = new Map([["a", 0.3]])
    const step = advanceLabelFades(fading, ids("a"), ids("a"), LABEL_FADE_MS / 10)
    expect(step.opacities.get("a")).toBeCloseTo(0.4, 12)
  })

  it("drops a fading label at once when its star left the cube", () => {
    const step = advanceLabelFades(new Map([["a", 0.8]]), ids(), ids(), 1)
    expect(step.opacities.has("a")).toBe(false)
    expect(step.animating).toBe(false)
  })

  it("does not change settled labels", () => {
    const settled = new Map([["a", 1]])
    const step = advanceLabelFades(settled, ids("a"), ids("a", "b"), 16)
    expect([...step.opacities]).toEqual([["a", 1]])
    expect(step.animating).toBe(false)
  })

  it("settles every label at once under reduced motion", () => {
    const step = advanceLabelFades(
      new Map([["b", 0.6]]),
      ids("a"),
      ids("a", "b"),
      fadeElapsedMs(0, 5, true),
    )
    expect([...step.opacities]).toEqual([["a", 1]])
    expect(step.animating).toBe(false)
  })
})

describe("fadeElapsedMs", () => {
  it("uses the time since the previous frame", () => {
    expect(fadeElapsedMs(100, 116, false)).toBe(16)
  })

  it("starts a fade at elapsed 0, so a label first shows at opacity 0", () => {
    expect(fadeElapsedMs(null, 5000, false)).toBe(0)
  })

  it("follows real time, however slow the frames are", () => {
    expect(fadeElapsedMs(0, 100, false)).toBe(100)
  })

  it("never goes backward", () => {
    expect(fadeElapsedMs(100, 90, false)).toBe(0)
  })
})
