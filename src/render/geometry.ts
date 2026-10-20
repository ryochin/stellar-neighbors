import { dot } from "../astro/coordinates"
import type { Vec3 } from "../catalog/types"

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v)
  return [v[0] / length, v[1] / length, v[2] / length]
}

/**
 * Polygon where the plane dot(normal, p) = offset cuts the cube [-half, half]^3,
 * with vertices ordered around the normal so it can be filled directly.
 */
export function clipPlaneToCube(normal: Vec3, offset: number, half: number): Vec3[] {
  const eps = 1e-7
  const vertices: Vec3[] = []
  for (let axis = 0; axis < 3; axis++) {
    const [u, w] = [0, 1, 2].filter((k) => k !== axis)
    for (const s1 of [-1, 1]) {
      for (const s2 of [-1, 1]) {
        const a: [number, number, number] = [0, 0, 0]
        const b: [number, number, number] = [0, 0, 0]
        a[u] = b[u] = s1 * half
        a[w] = b[w] = s2 * half
        a[axis] = -half
        b[axis] = half
        const da = dot(a, normal) - offset
        const db = dot(b, normal) - offset
        // Same side, or the whole edge lies in the plane (its endpoints come from other edges).
        if (da * db > 0 || da === db) continue
        const t = da / (da - db)
        const v: Vec3 = [
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
          a[2] + (b[2] - a[2]) * t,
        ]
        if (!vertices.some((p) => Math.hypot(p[0] - v[0], p[1] - v[1], p[2] - v[2]) < eps)) {
          vertices.push(v)
        }
      }
    }
  }
  const seed: Vec3 = Math.abs(normal[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0]
  const basis1 = normalize(cross(seed, normal))
  const basis2 = cross(normal, basis1)
  const angle = (v: Vec3): number => Math.atan2(dot(v, basis2), dot(v, basis1))
  return vertices.sort((p, q) => angle(p) - angle(q))
}
