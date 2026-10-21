import {
  NORTH_CELESTIAL_POLE,
  equatorialToCartesian,
  equatorialToGalactic,
  galacticVector,
} from "../../astro/coordinates"
import { UNITS, formatAxisValue } from "../../astro/units"
import { CUBE_HALF_LY } from "../../astro/visibility"
import type { Vec3 } from "../../catalog/types"
import { clipPlaneToCube } from "../geometry"
import type { RenderStar, RenderView } from "../renderer"
import { project, type CameraAngles, type Projected, type Viewport } from "./camera"

const TAU = Math.PI * 2
const MAX_LABELS = 240
const H = CUBE_HALF_LY

export interface DrawContext {
  ctx: CanvasRenderingContext2D
  angles: CameraAngles
  viewport: Viewport
}

export interface ProjectedStar extends Projected {
  item: RenderStar
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k]
const proj = (dc: DrawContext, p: Vec3): Projected => project(dc.angles, dc.viewport, p)

function line(
  dc: DrawContext,
  a: Vec3,
  b: Vec3,
  color: string,
  width = 1,
  dash: number[] = [],
): void {
  const { ctx } = dc
  const p = proj(dc, a)
  const q = proj(dc, b)
  ctx.beginPath()
  ctx.setLineDash(dash)
  ctx.moveTo(p.x, p.y)
  ctx.lineTo(q.x, q.y)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
  ctx.setLineDash([])
}

function arrow(dc: DrawContext, a: Vec3, b: Vec3, stroke: string, width = 1.6): void {
  line(dc, a, b, stroke, width)
  const { ctx } = dc
  const p = proj(dc, a)
  const q = proj(dc, b)
  const d = Math.hypot(q.x - p.x, q.y - p.y)
  if (d < 1) return
  const ux = (q.x - p.x) / d
  const uy = (q.y - p.y) / d
  ctx.beginPath()
  ctx.moveTo(q.x, q.y)
  ctx.lineTo(q.x - ux * 8 - uy * 4, q.y - uy * 8 + ux * 4)
  ctx.moveTo(q.x, q.y)
  ctx.lineTo(q.x - ux * 8 + uy * 4, q.y - uy * 8 - ux * 4)
  ctx.strokeStyle = stroke
  ctx.lineWidth = width
  ctx.stroke()
}

export function drawBackground(dc: DrawContext): void {
  const { ctx } = dc
  const { width: w, height: h } = dc.viewport
  ctx.clearRect(0, 0, w, h)
  const gradient = ctx.createRadialGradient(
    w * 0.53,
    h * 0.46,
    20,
    w * 0.5,
    h * 0.48,
    Math.max(w, h) * 0.78,
  )
  gradient.addColorStop(0, "#12243a")
  gradient.addColorStop(0.45, "#0a1325")
  gradient.addColorStop(1, "#040912")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  // Fixed seed so the decorative backdrop does not flicker between frames.
  let seed = 19273
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let i = 0; i < 170; i++) {
    const x = rand() * w
    const y = rand() * h
    const r = 0.25 + rand() * 0.75
    ctx.globalAlpha = 0.12 + rand() * 0.32
    ctx.fillStyle = "#9cbce0"
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawAxisTicks(dc: DrawContext, view: RenderView): void {
  const { ctx } = dc
  ctx.font = "10px sans-serif"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#aac1d6"
  for (const v of [-H, -H / 2, 0, H / 2, H]) {
    const text = formatAxisValue(v, view.unitMode)
    let p = proj(dc, [v, -H, -H])
    ctx.fillText(text, p.x - 8, p.y + 12)
    p = proj(dc, [-H, v, -H])
    ctx.fillText(text, p.x - 12, p.y + 10)
    p = proj(dc, [-H, -H, v])
    ctx.fillText(text, p.x - 28, p.y + 4)
  }
}

export function drawCube(dc: DrawContext, view: RenderView): void {
  if (!view.showGrid) return
  for (const v of [-H, -H / 2, 0, H / 2, H]) {
    line(dc, [v, -H, -H], [v, H, -H], "rgba(114,161,194,.115)", 0.7)
    line(dc, [-H, v, -H], [H, v, -H], "rgba(114,161,194,.115)", 0.7)
    line(dc, [v, -H, H], [v, H, H], "rgba(114,161,194,.055)", 0.65)
    line(dc, [-H, v, H], [H, v, H], "rgba(114,161,194,.055)", 0.65)
  }
  for (const x of [-H, H])
    for (const y of [-H, H]) line(dc, [x, y, -H], [x, y, H], "rgba(115,176,217,.3)", 1)
  for (const z of [-H, H]) {
    for (const y of [-H, H]) line(dc, [-H, y, z], [H, y, z], "rgba(115,176,217,.28)", 0.95)
    for (const x of [-H, H]) line(dc, [x, -H, z], [x, H, z], "rgba(115,176,217,.28)", 0.95)
  }
  line(dc, [-H, 0, 0], [H, 0, 0], "rgba(247,148,141,.40)", 1)
  line(dc, [0, -H, 0], [0, H, 0], "rgba(118,203,158,.40)", 1)
  line(dc, [0, 0, -H], [0, 0, H], "rgba(124,174,241,.48)", 1)
  drawAxisTicks(dc, view)

  const { ctx } = dc
  const names = ["Xg", "Yg", "Zg"]
  const colors = ["#e5a5a0", "#a0deba", "#a4c6f0"]
  const tips: Vec3[] = [
    [53, 0, 0],
    [0, 53, 0],
    [0, 0, 53],
  ]
  ctx.font = "11px sans-serif"
  tips.forEach((tip, i) => {
    const q = proj(dc, tip)
    ctx.fillStyle = colors[i]
    ctx.fillText(names[i], q.x - 7, q.y + 4)
  })
  const unit = UNITS[view.unitMode].label
  ctx.fillStyle = "#89a5ba"
  const p1 = proj(dc, [55, -55, -50])
  const p2 = proj(dc, [-55, 55, -50])
  const p3 = proj(dc, [-55, -55, 55])
  ctx.fillText(`X (${unit})`, p1.x - 18, p1.y + 16)
  ctx.fillText(`Y (${unit})`, p2.x - 18, p2.y + 16)
  ctx.fillText(`Z (${unit})`, p3.x - 32, p3.y + 4)
}

// The galactic plane passes through the Sun, so relative to the observer it shifts along the pole.
const planeOffset = (view: RenderView): number => -view.origin.gal[2]
const planeCenter = (view: RenderView): Vec3 => [0, 0, planeOffset(view)]

export function drawGalacticPlane(dc: DrawContext, view: RenderView): void {
  if (!view.showGalacticPlane) return
  const { ctx } = dc
  const polygon = clipPlaneToCube([0, 0, 1], planeOffset(view), H)
  if (polygon.length >= 3) {
    ctx.beginPath()
    polygon.forEach((v, i) => {
      const p = proj(dc, v)
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.closePath()
    ctx.fillStyle = "rgba(74,193,179,.105)"
    ctx.fill()
    ctx.strokeStyle = "rgba(112,218,207,.62)"
    ctx.lineWidth = 1.1
    ctx.stroke()

    const origin = planeCenter(view)
    for (const radius of [10, 20, 30, 40, 50]) {
      ctx.beginPath()
      for (let l = 0; l <= 360; l += 5) {
        const p = proj(dc, add(origin, galacticVector(l, radius)))
        if (l === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      }
      ctx.closePath()
      ctx.strokeStyle = "rgba(86,199,186,.18)"
      ctx.lineWidth = 0.8
      ctx.setLineDash([3, 5])
      ctx.stroke()
      ctx.setLineDash([])
    }
    for (let l = 0; l < 360; l += 30) {
      line(dc, origin, add(origin, galacticVector(l, 50)), "rgba(107,210,198,.13)", 0.75)
    }
  }
  arrow(dc, [0, 0, 0], galacticVector(0, 45), "rgba(255,197,120,.96)", 1.9)
  arrow(dc, [0, 0, 0], galacticVector(0, 43, 90), "rgba(141,184,255,.96)", 1.9)
  line(dc, [0, 0, 0], galacticVector(0, 38, -90), "rgba(141,184,255,.28)", 1, [4, 5])
}

// The celestial equator also passes through the Sun, so it shifts along its pole like the galactic plane.
const equatorOffset = (view: RenderView): number => -view.origin.eq[2]
const NCP_ARROW = scale(NORTH_CELESTIAL_POLE, 43)

export function drawCelestialEquator(dc: DrawContext, view: RenderView): void {
  if (!view.showCelestialEquator) return
  const { ctx } = dc
  const polygon = clipPlaneToCube(NORTH_CELESTIAL_POLE, equatorOffset(view), H)
  if (polygon.length >= 3) {
    ctx.beginPath()
    polygon.forEach((v, i) => {
      const p = proj(dc, v)
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.closePath()
    ctx.fillStyle = "rgba(186,150,255,.07)"
    ctx.fill()
    ctx.strokeStyle = "rgba(200,170,255,.62)"
    ctx.lineWidth = 1.1
    ctx.setLineDash([6, 5])
    ctx.stroke()
    ctx.setLineDash([])
  }
  arrow(dc, [0, 0, 0], NCP_ARROW, "rgba(208,180,255,.96)", 1.9)
  line(dc, [0, 0, 0], scale(NORTH_CELESTIAL_POLE, -38), "rgba(208,180,255,.28)", 1, [4, 5])
}

function annotatePoint(
  dc: DrawContext,
  point: Vec3,
  label: string,
  color: string,
  dx = 7,
  dy = -18,
): void {
  const { ctx, viewport } = dc
  const p = proj(dc, point)
  ctx.font = "600 11px -apple-system,BlinkMacSystemFont,sans-serif"
  const w = ctx.measureText(label).width + 16
  const h = 21
  const x = Math.min(Math.max(5, p.x + dx), viewport.width - w - 5)
  const y = Math.min(Math.max(5, p.y + dy), viewport.height - h - 5)
  ctx.fillStyle = "rgba(8,25,38,.88)"
  ctx.strokeStyle = `${color}85`
  ctx.lineWidth = 0.7
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 5)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = color
  ctx.textBaseline = "middle"
  ctx.fillText(label, x + 8, y + h / 2 + 0.5)
}

export function drawGalacticAnnotations(dc: DrawContext, view: RenderView): void {
  if (!view.showGalacticPlane) return
  annotatePoint(dc, galacticVector(0, 45), "Galactic center · l=0°", "#ffd19a", -10, -32)
  const pole = galacticVector(0, 43, 90)
  const n = proj(dc, pole)
  const c = proj(dc, [0, 0, 0])
  if (Math.hypot(n.x - c.x, n.y - c.y) > 28) {
    annotatePoint(dc, pole, "North galactic pole · b=+90°", "#a9c9ff", 10, -26)
  }
  if (Math.abs(view.origin.gal[2]) <= H) {
    annotatePoint(
      dc,
      add(planeCenter(view), galacticVector(226, 34)),
      "Galactic plane · b=0°",
      "#84eadb",
      7,
      12,
    )
  }
}

export function drawStars(dc: DrawContext, view: RenderView): ProjectedStar[] {
  const { ctx } = dc
  const { selected, observer } = view
  const projected = view.stars.map((item) => ({ ...proj(dc, item.pos), item }))

  const target = projected.find((p) => p.item.star === selected)
  if (target && selected !== observer) {
    const center = proj(dc, [0, 0, 0])
    ctx.beginPath()
    ctx.setLineDash([4, 5])
    ctx.moveTo(center.x, center.y)
    ctx.lineTo(target.x, target.y)
    ctx.strokeStyle = "rgba(100,227,242,.65)"
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Far to near so nearer stars paint over farther ones.
  for (const p of [...projected].sort((a, b) => a.depth - b.depth)) {
    const star = p.item.star
    const bright = star.priority >= 7 ? 3.4 : star.priority >= 4 ? 2.6 : 1.9
    const base =
      star === selected ? 5.5 : star === observer ? 5 : star.priority >= 4 ? bright : 1.55
    const radius = base * Math.pow(Math.max(0.8, p.f), 0.6)
    if (star.priority >= 4 || star === selected || star === observer) {
      const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 5.5)
      halo.addColorStop(0, `${star.color}99`)
      halo.addColorStop(0.25, `${star.color}55`)
      halo.addColorStop(1, `${star.color}00`)
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius * 5.5, 0, TAU)
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(p.x, p.y, radius, 0, TAU)
    ctx.fillStyle = star.color
    ctx.fill()
    if (star === selected) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius + 6, 0, TAU)
      ctx.strokeStyle = "#6de4ecaa"
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }
  return projected
}

export function drawLabels(dc: DrawContext, view: RenderView, projected: ProjectedStar[]): void {
  const { ctx, viewport } = dc
  const { selected, observer, labelMode } = view
  // "None" hides every star label, including the pinned selected and observer labels.
  if (labelMode === "none") return
  const rank = (p: ProjectedStar): number => {
    const star = p.item.star
    if (star === selected) return 100
    if (star === observer) return 95
    return star.priority * 10 - star.distLy / 12
  }
  const candidates = projected
    .filter((p) => {
      const star = p.item.star
      return star === selected || star === observer || labelMode === "all" || star.priority >= 4
    })
    .sort((a, b) => rank(b) - rank(a))

  const boxes: { x: number; y: number; w: number; h: number }[] = []
  ctx.font = "11px -apple-system,BlinkMacSystemFont,sans-serif"
  ctx.textBaseline = "middle"
  for (const p of candidates) {
    if (boxes.length >= MAX_LABELS) break
    const star = p.item.star
    const label = star.name
    const textWidth = ctx.measureText(label).width
    const x = p.x + 10
    const y = p.y - 11
    const box = { x, y: y - 7, w: textWidth + 7, h: 17 }
    if (x + textWidth > viewport.width - 5 || x < 0 || y < 12 || y > viewport.height - 9) continue
    const pinned = star === selected || star === observer
    const clash = boxes.some(
      (b) =>
        x < b.x + b.w + 7 &&
        x + box.w + 7 > b.x &&
        box.y < b.y + b.h + 4 &&
        box.y + box.h + 4 > b.y,
    )
    if (clash && !pinned) continue
    boxes.push(box)
    ctx.lineWidth = 3
    ctx.strokeStyle = "#081321"
    ctx.strokeText(label, x, y)
    ctx.fillStyle = star === selected ? "#a0f3ff" : star === observer ? "#69eeef" : "#d3e5f5"
    ctx.fillText(label, x, y)
  }
}

// Where the equator label sits: a point on the equator, away from the galactic plane label.
const EQUATOR_LABEL_DIR = equatorialToGalactic(equatorialToCartesian(18, 0, 34))

export function drawCelestialEquatorAnnotations(dc: DrawContext, view: RenderView): void {
  if (!view.showCelestialEquator) return
  const n = proj(dc, NCP_ARROW)
  const c = proj(dc, [0, 0, 0])
  if (Math.hypot(n.x - c.x, n.y - c.y) > 28) {
    annotatePoint(
      dc,
      NCP_ARROW,
      "North celestial pole (toward Polaris) · δ=+90°",
      "#d2bcff",
      10,
      -26,
    )
  }
  const anchor = add(scale(NORTH_CELESTIAL_POLE, equatorOffset(view)), EQUATOR_LABEL_DIR)
  if (anchor.every((v) => Math.abs(v) <= H)) {
    annotatePoint(dc, anchor, "Celestial equator · δ=0°", "#c9b2ff", 7, 12)
  }
}
