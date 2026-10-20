import { describe, expect, it } from "vitest"
import { GAL_Z } from "../../src/astro/coordinates"
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

  it("puts +x to the right and +z up when looking straight along +y", () => {
    const angles = { yaw: 0, pitch: 0, zoom: 1 }
    expect(project(angles, viewport, [10, 0, 0]).x).toBeCloseTo(510 + 10 * scale, 9)
    expect(project(angles, viewport, [0, 0, 10]).y).toBeCloseTo(416 - 10 * scale, 9)
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
