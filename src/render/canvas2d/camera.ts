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

// Small enough to keep the axis labels clear of the toolbar and legend on a 1440px screen.
const DEFAULT_ZOOM = 0.95

export function defaultAngles(): CameraAngles {
  return { yaw: 0.36, pitch: 0.29, zoom: DEFAULT_ZOOM }
}

// Looking straight down from the north galactic pole (+Z).
export function galacticPoleAngles(): CameraAngles {
  return { yaw: 0, pitch: Math.PI / 2, zoom: 1.08 }
}

export function project(angles: CameraAngles, viewport: Viewport, [x, y, z]: Vec3): Projected {
  const cy = Math.cos(angles.yaw)
  const sy = Math.sin(angles.yaw)
  const cp = Math.cos(angles.pitch)
  const sp = Math.sin(angles.pitch)
  // Screen right is up × toward-viewer, which keeps the projection right-handed.
  const xx = y * sy - x * cy
  const yy = x * sy + y * cy
  const up = z * cp - yy * sp
  const depth = yy * cp + z * sp
  const f = PERSPECTIVE_DISTANCE / (PERSPECTIVE_DISTANCE - depth)
  const scale = Math.min(viewport.width / 140, viewport.height / 144) * angles.zoom
  return {
    x: viewport.width * 0.51 + xx * scale * f,
    y: viewport.height * 0.5 - up * scale * f,
    depth,
    f,
  }
}
