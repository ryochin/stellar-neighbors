import type { Star } from "../../catalog/types"
import type { I18n } from "../../i18n/i18n"
import { transitionView } from "../observer-transition"
import type { CubeOrigin, RenderView, RendererCallbacks, StarRenderer } from "../renderer"
import {
  PITCH_LIMIT,
  defaultAngles,
  easeInOutCubic,
  galacticPoleAngles,
  interpolateAngles,
  scaleZoom,
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
  layoutLabels,
  type DrawContext,
  type ProjectedStar,
} from "./draw"
import { advanceLabelFades, fadeElapsedMs, type LabelOpacities } from "./label-fade"

const PICK_RADIUS_PX = 15
const DRAG_THRESHOLD_PX = 4
const VIEW_TRANSITION_MS = 500
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

function getContext2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D is not available")
  return ctx
}

export function createCanvas2dRenderer(callbacks: RendererCallbacks, i18n: I18n): StarRenderer {
  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-label", i18n.t.canvas.ariaLabel)
  const ctx = getContext2d(canvas)

  let stage: HTMLElement | null = null
  let resizeObserver: ResizeObserver | null = null
  let view: RenderView | null = null
  let angles: CameraAngles = defaultAngles()
  let viewport = { width: 0, height: 0 }
  let projected: ProjectedStar[] = []
  let labelOpacities: LabelOpacities = new Map()
  let lastLabelFadeMs: number | null = null
  // The camera and the observer move animate independently but share one frame loop.
  let animationFrame: number | null = null
  let cameraTransition: { from: CameraAngles; to: CameraAngles; start: number | null } | null = null
  let observerTransition: {
    from: CubeOrigin
    fromStars: Star[]
    start: number | null
    // Origin and stars of the latest frame; the other view fields always come from `view`.
    frame: Pick<RenderView, "origin" | "stars">
  } | null = null
  // `previousMoved` remembers the press before this one, so a drag cannot start a double-click.
  const drag = {
    active: false,
    moved: false,
    previousMoved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  }
  // Pressed pointers by id; two of them pinch to zoom. `pinchSpread` is null outside a pinch.
  const pointers = new Map<number, { x: number; y: number }>()
  let pinchSpread: number | null = null

  const stageElement = (): HTMLElement => {
    if (!stage) throw new Error("renderer is not mounted")
    return stage
  }

  function draw(): void {
    if (!view || !viewport.width || !viewport.height) return
    const shown: RenderView = observerTransition ? { ...view, ...observerTransition.frame } : view
    const dc = { ctx, angles, viewport, i18n }
    drawBackground(dc)
    drawCube(dc, shown)
    drawGalacticPlane(dc, shown)
    drawCelestialEquator(dc, shown)
    projected = drawStars(dc, shown)
    drawFadingLabels(dc, shown)
    drawGalacticAnnotations(dc, shown)
    drawCelestialEquatorAnnotations(dc, shown)
  }

  // Labels fade in and out; the frame loop keeps running until every fade has finished.
  function drawFadingLabels(dc: DrawContext, shown: RenderView): void {
    const now: number = performance.now()
    const elapsed: number = fadeElapsedMs(lastLabelFadeMs, now, prefersReducedMotion())
    const present = new Set<string>(projected.map((p) => p.item.star.id))
    const fade = advanceLabelFades(
      labelOpacities,
      layoutLabels(dc, shown, projected),
      present,
      elapsed,
    )
    labelOpacities = fade.opacities
    lastLabelFadeMs = fade.animating ? now : null
    drawLabels(dc, shown, projected, labelOpacities)
    if (fade.animating) requestTick()
  }

  const prefersReducedMotion = (): boolean =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const progress = (start: number, now: number): number =>
    Math.min(1, (now - start) / VIEW_TRANSITION_MS)

  function tick(now: number): void {
    animationFrame = null
    if (cameraTransition) {
      const { from, to } = cameraTransition
      const t: number = progress((cameraTransition.start ??= now), now)
      // Land exactly on the target; the shortest-way yaw can differ from it by whole turns.
      angles = t < 1 ? interpolateAngles(from, to, easeInOutCubic(t)) : to
      if (t === 1) cameraTransition = null
    }
    if (observerTransition && view) {
      const t: number = progress((observerTransition.start ??= now), now)
      const { from, fromStars } = observerTransition
      const { origin, stars } = transitionView(view, from, fromStars, easeInOutCubic(t))
      observerTransition.frame = { origin, stars }
      if (t === 1) observerTransition = null
    }
    if (cameraTransition || observerTransition) animationFrame = requestAnimationFrame(tick)
    draw()
  }

  function requestTick(): void {
    animationFrame ??= requestAnimationFrame(tick)
  }

  function stopAnimation(): void {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame)
    animationFrame = null
    cameraTransition = null
    observerTransition = null
  }

  // User input takes over the camera; an observer move in progress keeps going.
  function stopCameraAnimation(): void {
    cameraTransition = null
  }

  // Eases the camera from where it is now to the target.
  function animateTo(target: CameraAngles): void {
    if (prefersReducedMotion()) {
      cameraTransition = null
      angles = target
      draw()
      return
    }
    cameraTransition = { from: angles, to: target, start: null }
    requestTick()
  }

  // Slides the cube from the old observer to the new one; a move in progress continues from where it is.
  function startObserverTransition(previous: RenderView, next: RenderView): void {
    const { origin, stars } = observerTransition?.frame ?? previous
    // The catalog load swaps the placeholder Sun for the real one in the same place: nothing to move.
    const samePlace = origin.gal.every((v, i) => v === next.origin.gal[i])
    if (prefersReducedMotion() || samePlace) {
      observerTransition = null
      return
    }
    observerTransition = {
      from: origin,
      fromStars: stars.map((s) => s.star),
      start: null,
      frame: { origin, stars },
    }
    requestTick()
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
  // Panels laid over the stage opt out with data-no-stage-input, so pressing them never rotates the map.
  const isOnControl = (e: Event): boolean =>
    e.target instanceof Element && e.target.closest("button, [data-no-stage-input]") !== null

  function pointerSpread(): number {
    const [a, b] = [...pointers.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  function onPointerDown(e: PointerEvent): void {
    if (isOnControl(e)) return
    stopCameraAnimation()
    const [x, y] = pointerPosition(e)
    // A new primary pointer means every earlier one has ended, even if its pointerup got lost.
    if (e.isPrimary) pointers.clear()
    pointers.set(e.pointerId, { x, y })
    stageElement().setPointerCapture(e.pointerId)
    if (pointers.size === 2) {
      // A second finger turns the drag into a pinch; the press can no longer be a tap.
      pinchSpread = pointerSpread()
      drag.active = false
      drag.moved = true
      return
    }
    if (pointers.size > 2) return
    Object.assign(drag, {
      active: true,
      moved: false,
      previousMoved: drag.moved,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
    })
    stageElement().classList.add("dragging")
    callbacks.onStarHover(null, 0, 0)
  }

  function onPointerMove(e: PointerEvent): void {
    const [x, y] = pointerPosition(e)
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x, y })
    if (pinchSpread !== null) {
      const spread: number = pointerSpread()
      if (pinchSpread > 0 && spread > 0) angles = scaleZoom(angles, spread / pinchSpread)
      pinchSpread = spread
      draw()
      return
    }
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
    // A finger left over from a pinch neither rotates nor hovers.
    if (pointers.size > 0) return
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
    releasePointer(e)
  }

  function releasePointer(e: PointerEvent): void {
    pointers.delete(e.pointerId)
    endPress()
  }

  function endPress(): void {
    // Lifting a third finger restarts the pinch from the remaining pair so the zoom does not jump.
    pinchSpread = pointers.size >= 2 ? pointerSpread() : null
    drag.active = false
    if (pointers.size === 0) stageElement().classList.remove("dragging")
  }

  function onPointerLeave(): void {
    if (!drag.active) callbacks.onStarHover(null, 0, 0)
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault()
    stopCameraAnimation()
    angles = scaleZoom(angles, Math.exp(-e.deltaY * 0.0011))
    draw()
  }

  function onDoubleClick(e: MouseEvent): void {
    if (isOnControl(e) || drag.moved || drag.previousMoved) return
    const star = starAt(...pointerPosition(e))
    if (star) callbacks.onStarDoubleClick(star)
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
    animateTo(defaultAngles())
  }

  return {
    mount(container) {
      stage = container
      container.prepend(canvas)
      container.addEventListener("pointerdown", onPointerDown)
      container.addEventListener("pointermove", onPointerMove)
      container.addEventListener("pointerup", onPointerUp)
      container.addEventListener("pointercancel", releasePointer)
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
      if (view && next.observer !== view.observer) startObserverTransition(view, next)
      view = next
      draw()
    },
    resetView,
    lookFromGalacticPole() {
      animateTo(galacticPoleAngles())
    },
    resize,
    dispose() {
      stopAnimation()
      const container = stageElement()
      container.removeEventListener("pointerdown", onPointerDown)
      container.removeEventListener("pointermove", onPointerMove)
      container.removeEventListener("pointerup", onPointerUp)
      container.removeEventListener("pointercancel", releasePointer)
      container.removeEventListener("pointerleave", onPointerLeave)
      container.removeEventListener("wheel", onWheel)
      container.removeEventListener("dblclick", onDoubleClick)
      window.removeEventListener("resize", resize)
      resizeObserver?.disconnect()
      pointers.clear()
      endPress()
      container.style.cursor = ""
      callbacks.onStarHover(null, 0, 0)
      canvas.remove()
      stage = null
    },
  }
}
