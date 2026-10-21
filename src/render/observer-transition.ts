import { CUBE_HALF_LY } from "../astro/visibility"
import type { Star, Vec3 } from "../catalog/types"
import type { CubeOrigin, RenderStar, RenderView } from "./renderer"

const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

export function lerpOrigin(from: CubeOrigin, to: CubeOrigin, t: number): CubeOrigin {
  return { gal: lerpVec3(from.gal, to.gal, t), eq: lerpVec3(from.eq, to.eq, t) }
}

/**
 * `view` partway (`t` in [0, 1]) through an observer move that started at `from`.
 * Stars of both the old and the new cube slide with the origin; only those inside the cube are kept.
 */
export function transitionView(
  view: RenderView,
  from: CubeOrigin,
  fromStars: readonly Star[],
  t: number,
): RenderView {
  const origin = lerpOrigin(from, view.origin, t)
  const candidates = new Map<string, Star>()
  for (const star of fromStars) candidates.set(star.id, star)
  for (const { star } of view.stars) candidates.set(star.id, star)
  const stars: RenderStar[] = []
  for (const star of candidates.values()) {
    const pos: Vec3 = [
      star.gal[0] - origin.gal[0],
      star.gal[1] - origin.gal[1],
      star.gal[2] - origin.gal[2],
    ]
    if (pos.every((v) => Math.abs(v) <= CUBE_HALF_LY)) stars.push({ star, pos })
  }
  return { ...view, origin, stars }
}
