import type { UnitMode } from "../astro/units"
import { relativePosition } from "../astro/visibility"
import type { Star, Vec3 } from "../catalog/types"
import { getActiveStars, type AppState, type LabelMode } from "../state/app-state"

export interface RenderStar {
  star: Star
  /** Observer-relative galactic position, ly. */
  pos: Vec3
}

export interface RenderView {
  stars: RenderStar[]
  observer: Star
  selected: Star | null
  unitMode: UnitMode
  labelMode: LabelMode
  showGrid: boolean
  showGalacticPlane: boolean
  showCelestialEquator: boolean
}

export interface RendererCallbacks {
  onStarClick(star: Star): void
  onStarHover(star: Star | null, screenX: number, screenY: number): void
  /** Double-click on the stage; the app decides what a reset covers. */
  onResetRequest(): void
}

export interface StarRenderer {
  mount(container: HTMLElement): void
  update(view: RenderView): void
  resetView(): void
  lookFromGalacticPole(): void
  resize(): void
  dispose(): void
}

export function buildRenderView(state: AppState): RenderView {
  return {
    stars: getActiveStars(state).map((star) => ({
      star,
      pos: relativePosition(star, state.observer),
    })),
    observer: state.observer,
    selected: state.selected,
    unitMode: state.unitMode,
    labelMode: state.labelMode,
    showGrid: state.showGrid,
    showGalacticPlane: state.showGalacticPlane,
    showCelestialEquator: state.showCelestialEquator,
  }
}
