import { describe, expect, it } from "vitest"
import type { Vec3 } from "../../src/catalog/types"
import {
  defaultAngles,
  easeInOutCubic,
  galacticPoleAngles,
  interpolateAngles,
  PITCH_LIMIT,
  project,
} from "../../src/render/canvas2d/camera"

const viewport = { width: 1000, height: 800 }
// min(1000 / 140, 800 / 144)
const scale = 800 / 144

describe("project", () => {
  it("maps the origin to the stage anchor point", () => {
    const p = project(defaultAngles(), viewport, [0, 0, 0])
    expect(p.x).toBeCloseTo(510, 9)
    expect(p.y).toBeCloseTo(400, 9)
    expect(p.f).toBe(1)
  })

  it("puts +x to the left and +z up when looking from +y toward the origin", () => {
    const angles = { yaw: 0, pitch: 0, zoom: 1 }
    expect(project(angles, viewport, [10, 0, 0]).x).toBeCloseTo(510 - 10 * scale, 9)
    expect(project(angles, viewport, [0, 0, 10]).y).toBeCloseTo(400 - 10 * scale, 9)
  })

  it("keeps the axes right-handed (screen right × up = toward the viewer)", () => {
    for (const angles of [
      { yaw: 0, pitch: 0, zoom: 1 },
      defaultAngles(),
      { yaw: -2.1, pitch: -1.2, zoom: 3 },
      { yaw: 1.3, pitch: PITCH_LIMIT, zoom: 1 },
      { yaw: -0.7, pitch: -PITCH_LIMIT, zoom: 1 },
    ]) {
      // Undo the perspective so each row is the axis in (right, up, toward-viewer) form.
      const rows: number[][] = (
        [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ] as const
      ).map((axis) => {
        const p = project(angles, viewport, axis)
        const s = scale * angles.zoom * p.f
        return [(p.x - 510) / s, (400 - p.y) / s, p.depth]
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
    const angles = galacticPoleAngles()
    const toScreen = (p: Vec3): [number, number] => {
      const q = project(angles, viewport, p)
      return [q.x - 510, 400 - q.y]
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
  it("looks straight down the z axis", () => {
    const angles = galacticPoleAngles()
    expect(angles.pitch).toBeCloseTo(Math.PI / 2, 9)
    expect(angles.zoom).toBe(1.08)
  })

  it("sits at the drag pitch limit, so a drag from the top-down view does not jump", () => {
    expect(galacticPoleAngles().pitch).toBe(PITCH_LIMIT)
  })
})

describe("easeInOutCubic", () => {
  it("starts at 0, passes 0.5 halfway and ends at 1", () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 12)
    expect(easeInOutCubic(1)).toBe(1)
  })

  it("never moves backward", () => {
    let previous = 0
    for (let i = 1; i <= 100; i++) {
      const value = easeInOutCubic(i / 100)
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
  })
})

describe("interpolateAngles", () => {
  const from = { yaw: 0.36, pitch: 0.29, zoom: 0.95 }
  const to = { yaw: 0, pitch: Math.PI / 2, zoom: 1.08 }

  it("matches the endpoints", () => {
    expect(interpolateAngles(from, to, 0)).toEqual(from)
    const end = interpolateAngles(from, to, 1)
    expect(end.yaw).toBeCloseTo(to.yaw, 12)
    expect(end.pitch).toBeCloseTo(to.pitch, 12)
    expect(end.zoom).toBeCloseTo(to.zoom, 12)
  })

  it("turns the yaw the short way round", () => {
    // 3.0 → -3.0 is 0.28 rad forward across ±π, not 6 rad backward.
    const mid = interpolateAngles({ ...from, yaw: 3 }, { ...to, yaw: -3 }, 0.5)
    expect(mid.yaw).toBeCloseTo(3 + (2 * Math.PI - 6) / 2, 12)
  })

  it("ignores whole turns the yaw has piled up from dragging", () => {
    const end = interpolateAngles({ ...from, yaw: 0.36 + 4 * Math.PI }, to, 1)
    expect(Math.cos(end.yaw)).toBeCloseTo(Math.cos(to.yaw), 12)
    expect(Math.sin(end.yaw)).toBeCloseTo(Math.sin(to.yaw), 12)
    expect(Math.abs(end.yaw - (0.36 + 4 * Math.PI))).toBeLessThanOrEqual(Math.PI)
  })

  it("changes the zoom at a constant ratio", () => {
    const mid = interpolateAngles({ ...from, zoom: 1 }, { ...to, zoom: 4 }, 0.5)
    expect(mid.zoom).toBeCloseTo(2, 12)
  })
})
