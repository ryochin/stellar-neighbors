import { describe, expect, it } from "vitest"
import type { Vec3 } from "../../src/catalog/types"
import { clipPlaneToCube } from "../../src/render/geometry"

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

// Every consecutive edge turns the same way around the normal.
const isConvexCycle = (polygon: Vec3[], normal: Vec3): boolean => {
  const turns = polygon.map((p, i) => {
    const q = polygon[(i + 1) % polygon.length]
    const r = polygon[(i + 2) % polygon.length]
    return dot(cross(sub(q, p), sub(r, q)), normal)
  })
  return turns.every((t) => t > 0) || turns.every((t) => t < 0)
}

describe("clipPlaneToCube", () => {
  it("returns the four corners for the z = 0 plane", () => {
    const polygon = clipPlaneToCube([0, 0, 1], 0, 50)
    expect(polygon).toHaveLength(4)
    polygon.forEach(([x, y, z]) => {
      expect(Math.abs(x)).toBeCloseTo(50, 9)
      expect(Math.abs(y)).toBeCloseTo(50, 9)
      expect(z).toBeCloseTo(0, 9)
    })
  })

  it("returns nothing when the plane misses the cube", () => {
    expect(clipPlaneToCube([0, 0, 1], 60, 50)).toHaveLength(0)
  })

  it("returns an ordered hexagon for the diagonal plane through the center", () => {
    const n = 1 / Math.sqrt(3)
    const normal: Vec3 = [n, n, n]
    const polygon = clipPlaneToCube(normal, 0, 50)
    expect(polygon).toHaveLength(6)
    expect(isConvexCycle(polygon, normal)).toBe(true)
  })

  it("keeps edges that cross the plane while nearly parallel to it", () => {
    const normal: Vec3 = [1, 1e-9, 0]
    const polygon = clipPlaneToCube(normal, 1, 1)
    expect(polygon).toHaveLength(4)
    polygon.forEach(([x]) => expect(x).toBeCloseTo(1, 6))
  })

  it.each([0.89, 0.91])("orders vertices when normal x is %s (around the seed switch)", (nx) => {
    const ny = Math.sqrt(1 - nx * nx) / Math.SQRT2
    const normal: Vec3 = [nx, ny, ny]
    const polygon = clipPlaneToCube(normal, 0.1, 1)
    expect(polygon.length).toBeGreaterThanOrEqual(3)
    expect(isConvexCycle(polygon, normal)).toBe(true)
  })
})
