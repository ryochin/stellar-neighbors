import { galacticPoleIn, type CoordMode } from "../../astro/coordinates"
import type { Vec3 } from "../../catalog/types"

export interface CameraAngles {
  yaw: number
  pitch: number
  zoom: number
}

export interface Viewport {
  width: number
  height: number
}

export interface Projected {
  x: number
  y: number
  depth: number
  /** Perspective factor; > 1 means nearer than the origin. */
  f: number
}

export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 12
export const PITCH_LIMIT = 1.47
const PERSPECTIVE_DISTANCE = 240

export function defaultAngles(mode: CoordMode): CameraAngles {
  return mode === "gal"
    ? { yaw: 2.76, pitch: 0.29, zoom: 0.95 }
    : { yaw: -0.57, pitch: 0.4, zoom: 1 }
}

export function galacticPoleAngles(mode: CoordMode): CameraAngles {
  const dir = galacticPoleIn(mode)
  return { yaw: Math.atan2(dir[0], dir[1]), pitch: Math.asin(dir[2]), zoom: 1.08 }
}

export function project(angles: CameraAngles, viewport: Viewport, [x, y, z]: Vec3): Projected {
  const cy = Math.cos(angles.yaw)
  const sy = Math.sin(angles.yaw)
  const cp = Math.cos(angles.pitch)
  const sp = Math.sin(angles.pitch)
  const xx = x * cy - y * sy
  const yy = x * sy + y * cy
  const up = z * cp - yy * sp
  const depth = yy * cp + z * sp
  const f = PERSPECTIVE_DISTANCE / (PERSPECTIVE_DISTANCE - depth)
  const scale = Math.min(viewport.width / 140, viewport.height / 144) * angles.zoom
  return {
    x: viewport.width * 0.51 + xx * scale * f,
    y: viewport.height * 0.52 - up * scale * f,
    depth,
    f,
  }
}
