import { describe, expect, it } from "vitest"
import type { Star, Vec3 } from "../../src/catalog/types"
import { lerpOrigin, transitionView } from "../../src/render/observer-transition"
import { buildRenderView } from "../../src/render/renderer"
import { createInitialState } from "../../src/state/app-state"
import { makeStarFromGal } from "../helpers"

const sun: Star = makeStarFromGal("sun", [0, 0, 0])
const target: Star = makeStarFromGal("target", [40, 0, 0])
// Inside the Sun's cube only, inside the target's cube only, and inside both.
const westOnly: Star = makeStarFromGal("west", [-30, 0, 0])
const eastOnly: Star = makeStarFromGal("east", [80, 0, 0])
const shared: Star = makeStarFromGal("shared", [20, 10, 0])
const stars: Star[] = [sun, target, westOnly, eastOnly, shared]

const viewFrom = (observer: Star) =>
  buildRenderView({ ...createInitialState(), stars, observer, selected: observer })

const ids = (view: ReturnType<typeof viewFrom>): string[] => view.stars.map((s) => s.star.id).sort()
const posOf = (view: ReturnType<typeof viewFrom>, id: string): Vec3 | undefined =>
  view.stars.find((s) => s.star.id === id)?.pos

describe("lerpOrigin", () => {
  it("interpolates both the galactic and the equatorial position", () => {
    const from = { gal: [0, 0, 0] as Vec3, eq: [2, 4, 6] as Vec3 }
    const to = { gal: [10, -20, 30] as Vec3, eq: [4, 8, 12] as Vec3 }
    expect(lerpOrigin(from, to, 0.5)).toEqual({ gal: [5, -10, 15], eq: [3, 6, 9] })
  })
})

describe("transitionView", () => {
  const before = viewFrom(sun)
  const after = viewFrom(target)
  const fromStars = before.stars.map((s) => s.star)

  it("starts with the old cube: positions relative to the old observer", () => {
    const view = transitionView(after, before.origin, fromStars, 0)
    expect(view.origin).toEqual(before.origin)
    expect(ids(view)).toEqual(ids(before))
    expect(posOf(view, "target")).toEqual([40, 0, 0])
  })

  it("ends with the new cube and drops the stars that left it", () => {
    const view = transitionView(after, before.origin, fromStars, 1)
    expect(view.origin.gal).toEqual(target.gal)
    expect(ids(view)).toEqual(ids(after))
    expect(posOf(view, "west")).toBeUndefined()
    expect(posOf(view, "target")).toEqual([0, 0, 0])
  })

  it("slides the stars of both cubes halfway and keeps the new observer and settings", () => {
    const view = transitionView({ ...after, labelMode: "all" }, before.origin, fromStars, 0.5)
    expect(view.origin.gal).toEqual([20, 0, 0])
    expect(posOf(view, "west")).toEqual([-50, 0, 0])
    // At x = 60 it is still outside the cube; it enters later in the move.
    expect(posOf(view, "east")).toBeUndefined()
    expect(posOf(view, "shared")).toEqual([0, 10, 0])
    expect(view.observer).toBe(target)
    expect(view.labelMode).toBe("all")
    expect(view.stars.filter((s) => s.star.id === "shared")).toHaveLength(1)
  })
})
