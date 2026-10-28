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
// Drag may reach the poles: project() rotates explicitly, so pitch ±π/2 has no singularity.
export const PITCH_LIMIT = Math.PI / 2
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

/** Multiplies the zoom by `factor` (wheel or pinch), kept within MIN_ZOOM..MAX_ZOOM. */
export function scaleZoom(angles: CameraAngles, factor: number): CameraAngles {
  return { ...angles, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, angles.zoom * factor)) }
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

// Wraps an angle difference into [-π, π) so the yaw turns the short way round.
function shortestAngleDelta(from: number, to: number): number {
  const delta: number = (to - from) % (2 * Math.PI)
  if (delta >= Math.PI) return delta - 2 * Math.PI
  if (delta < -Math.PI) return delta + 2 * Math.PI
  return delta
}

/** Camera angles at progress t (0..1, already eased); zoom changes at a constant ratio. */
export function interpolateAngles(from: CameraAngles, to: CameraAngles, t: number): CameraAngles {
  return {
    yaw: from.yaw + shortestAngleDelta(from.yaw, to.yaw) * t,
    pitch: from.pitch + (to.pitch - from.pitch) * t,
    zoom: from.zoom * (to.zoom / from.zoom) ** t,
  }
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
