import type { Star } from "../../catalog/types"
import type { RenderView, RendererCallbacks, StarRenderer } from "../renderer"
import {
  MAX_ZOOM,
  MIN_ZOOM,
  PITCH_LIMIT,
  defaultAngles,
  galacticPoleAngles,
  type CameraAngles,
} from "./camera"
import {
  drawBackground,
  drawCelestialEquator,
  drawCelestialEquatorAnnotations,
  drawCube,
  drawGalacticAnnotations,
  drawGalacticPlane,
  drawLabels,
  drawStars,
  type ProjectedStar,
} from "./draw"

const PICK_RADIUS_PX = 15
const DRAG_THRESHOLD_PX = 4
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

function getContext2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D is not available")
  return ctx
}

export function createCanvas2dRenderer(callbacks: RendererCallbacks): StarRenderer {
  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-label", "3D map of nearby stars, drag to rotate")
  const ctx = getContext2d(canvas)

  let stage: HTMLElement | null = null
  let resizeObserver: ResizeObserver | null = null
  let view: RenderView | null = null
  let angles: CameraAngles = defaultAngles()
  let viewport = { width: 0, height: 0 }
  let projected: ProjectedStar[] = []
  const drag = { active: false, moved: false, startX: 0, startY: 0, lastX: 0, lastY: 0 }

  const stageElement = (): HTMLElement => {
    if (!stage) throw new Error("renderer is not mounted")
    return stage
  }

  function draw(): void {
    if (!view || !viewport.width || !viewport.height) return
    const dc = { ctx, angles, viewport }
    drawBackground(dc)
    drawCube(dc, view)
    drawGalacticPlane(dc, view)
    drawCelestialEquator(dc, view)
    projected = drawStars(dc, view)
    drawLabels(dc, view, projected)
    drawGalacticAnnotations(dc, view)
    drawCelestialEquatorAnnotations(dc, view)
  }

  function starAt(x: number, y: number): Star | null {
    let best: Star | null = null
    let bestDistance = PICK_RADIUS_PX
    for (const p of projected) {
      const d = Math.hypot(x - p.x, y - p.y)
      if (d < bestDistance) {
        bestDistance = d
        best = p.item.star
      }
    }
    return best
  }

  const pointerPosition = (e: MouseEvent): [number, number] => {
    const rect = stageElement().getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }
  const isOnControl = (e: Event): boolean =>
    e.target instanceof Element && e.target.closest("button") !== null

  function onPointerDown(e: PointerEvent): void {
    if (isOnControl(e)) return
    const [x, y] = pointerPosition(e)
    Object.assign(drag, { active: true, moved: false, startX: x, startY: y, lastX: x, lastY: y })
    stageElement().classList.add("dragging")
    stageElement().setPointerCapture(e.pointerId)
    callbacks.onStarHover(null, 0, 0)
  }

  function onPointerMove(e: PointerEvent): void {
    const [x, y] = pointerPosition(e)
    if (drag.active) {
      if (Math.hypot(x - drag.startX, y - drag.startY) > DRAG_THRESHOLD_PX) drag.moved = true
      angles = {
        ...angles,
        yaw: angles.yaw + (x - drag.lastX) * 0.0075,
        pitch: clamp(angles.pitch + (y - drag.lastY) * 0.0065, -PITCH_LIMIT, PITCH_LIMIT),
      }
      drag.lastX = x
      drag.lastY = y
      draw()
      return
    }
    const star = starAt(x, y)
    stageElement().style.cursor = star ? "pointer" : "grab"
    callbacks.onStarHover(star, x, y)
  }

  function onPointerUp(e: PointerEvent): void {
    const [x, y] = pointerPosition(e)
    if (drag.active && !drag.moved) {
      const star = starAt(x, y)
      if (star) callbacks.onStarClick(star)
    }
    drag.active = false
    stageElement().classList.remove("dragging")
  }

  function onPointerCancel(): void {
    drag.active = false
    stageElement().classList.remove("dragging")
  }

  function onPointerLeave(): void {
    if (!drag.active) callbacks.onStarHover(null, 0, 0)
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault()
    angles = {
      ...angles,
      zoom: clamp(angles.zoom * Math.exp(-e.deltaY * 0.0011), MIN_ZOOM, MAX_ZOOM),
    }
    draw()
  }

  function onDoubleClick(e: MouseEvent): void {
    if (!isOnControl(e)) callbacks.onResetRequest()
  }

  function resize(): void {
    const rect = stageElement().getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    viewport = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) }
    canvas.width = Math.round(viewport.width * dpr)
    canvas.height = Math.round(viewport.height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw()
  }

  function resetView(): void {
    angles = defaultAngles()
    draw()
  }

  return {
    mount(container) {
      stage = container
      container.prepend(canvas)
      container.addEventListener("pointerdown", onPointerDown)
      container.addEventListener("pointermove", onPointerMove)
      container.addEventListener("pointerup", onPointerUp)
      container.addEventListener("pointercancel", onPointerCancel)
      container.addEventListener("pointerleave", onPointerLeave)
      container.addEventListener("wheel", onWheel, { passive: false })
      container.addEventListener("dblclick", onDoubleClick)
      // Also listen on window: moving to a display with another pixel ratio keeps the CSS size.
      window.addEventListener("resize", resize)
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(container)
      resize()
    },
    update(next) {
      view = next
      draw()
    },
    resetView,
    lookFromGalacticPole() {
      angles = galacticPoleAngles()
      draw()
    },
    resize,
    dispose() {
      const container = stageElement()
      container.removeEventListener("pointerdown", onPointerDown)
      container.removeEventListener("pointermove", onPointerMove)
      container.removeEventListener("pointerup", onPointerUp)
      container.removeEventListener("pointercancel", onPointerCancel)
      container.removeEventListener("pointerleave", onPointerLeave)
      container.removeEventListener("wheel", onWheel)
      container.removeEventListener("dblclick", onDoubleClick)
      window.removeEventListener("resize", resize)
      resizeObserver?.disconnect()
      onPointerCancel()
      container.style.cursor = ""
      callbacks.onStarHover(null, 0, 0)
      canvas.remove()
      stage = null
    },
  }
}
