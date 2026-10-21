import { describe, expect, it } from "vitest"
import { GAL_Z } from "../../src/astro/coordinates"
import type { Vec3 } from "../../src/catalog/types"
import { defaultAngles, galacticPoleAngles, project } from "../../src/render/canvas2d/camera"

const viewport = { width: 1000, height: 800 }
// min(1000 / 140, 800 / 144)
const scale = 800 / 144

describe("project", () => {
  it("maps the origin to the stage anchor point", () => {
    const p = project(defaultAngles("gal"), viewport, [0, 0, 0])
    expect(p.x).toBeCloseTo(510, 9)
    expect(p.y).toBeCloseTo(416, 9)
    expect(p.f).toBe(1)
  })

  it("puts +x to the left and +z up when looking from +y toward the origin", () => {
    const angles = { yaw: 0, pitch: 0, zoom: 1 }
    expect(project(angles, viewport, [10, 0, 0]).x).toBeCloseTo(510 - 10 * scale, 9)
    expect(project(angles, viewport, [0, 0, 10]).y).toBeCloseTo(416 - 10 * scale, 9)
  })

  it("keeps the axes right-handed (screen right × up = toward the viewer)", () => {
    for (const angles of [
      { yaw: 0, pitch: 0, zoom: 1 },
      defaultAngles("gal"),
      defaultAngles("eq"),
      { yaw: -2.1, pitch: -1.2, zoom: 3 },
    ]) {
      // Undo the perspective so each row is the axis in (right, up, toward-viewer) form.
      const rows: number[][] = ([[1, 0, 0], [0, 1, 0], [0, 0, 1]] as const).map((axis) => {
        const p = project(angles, viewport, axis)
        const s = scale * angles.zoom * p.f
        return [(p.x - 510) / s, (416 - p.y) / s, p.depth]
      })
      const [a, b, c] = rows
      const det: number =
        a[0] * (b[1] * c[2] - b[2] * c[1]) -
        a[1] * (b[0] * c[2] - b[2] * c[0]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])
      expect(det).toBeCloseTo(1, 9)
    }
  })

  it("turns galactic longitude counterclockwise when seen from the north galactic pole", () => {
    const angles = galacticPoleAngles("gal")
    const toScreen = (p: Vec3): [number, number] => {
      const q = project(angles, viewport, p)
      return [q.x - 510, 416 - q.y]
    }
    const [x1, y1] = toScreen([10, 0, 0])
    const [x2, y2] = toScreen([0, 10, 0])
    // +y (l = 90°) sits 90° counterclockwise from +x (l = 0°).
    expect(x1 * y2 - y1 * x2).toBeGreaterThan(0)
    expect(x1 * x2 + y1 * y2).toBeCloseTo(0, 9)
  })

  it("enlarges points nearer than the origin", () => {
    const angles = { yaw: 0, pitch: 0, zoom: 1 }
    const p = project(angles, viewport, [0, 40, 0])
    expect(p.depth).toBeCloseTo(40, 9)
    expect(p.f).toBeCloseTo(240 / 200, 9)
  })
})

describe("galacticPoleAngles", () => {
  it("looks straight down the z axis in galactic mode", () => {
    const angles = galacticPoleAngles("gal")
    expect(angles.pitch).toBeCloseTo(Math.PI / 2, 9)
    expect(angles.zoom).toBe(1.08)
  })

  it("follows the galactic pole direction in equatorial mode", () => {
    const angles = galacticPoleAngles("eq")
    expect(angles.yaw).toBeCloseTo(Math.atan2(GAL_Z[0], GAL_Z[1]), 9)
    expect(angles.pitch).toBeCloseTo(Math.asin(GAL_Z[2]), 9)
  })
})
