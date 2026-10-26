import type { UnitMode } from "../astro/units"
import { relativePosition } from "../astro/visibility"
import type { Star, Vec3 } from "../catalog/types"
import { getActiveStars, type AppState, type LabelMode } from "../state/app-state"

export interface RenderStar {
  star: Star
  /** Observer-relative galactic position, ly. */
  pos: Vec3
}

/** Center of the drawn cube: the observer, or a point between two observers during a move. */
export interface CubeOrigin {
  gal: Vec3
  eq: Vec3
}

export interface RenderView {
  stars: RenderStar[]
  observer: Star
  origin: CubeOrigin
  selected: Star | null
  unitMode: UnitMode
  labelMode: LabelMode
  /** The cube, its axes and the galactic plane with its pointers. */
  showCoordinates: boolean
  showCelestialEquator: boolean
}

export interface RendererCallbacks {
  onStarClick(star: Star): void
  onStarHover(star: Star | null, screenX: number, screenY: number): void
  /** Double-click on a star; empty space and drags are ignored. */
  onStarDoubleClick(star: Star): void
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
    origin: { gal: state.observer.gal, eq: state.observer.eq },
    selected: state.selected,
    unitMode: state.unitMode,
    labelMode: state.labelMode,
    showCoordinates: state.showCoordinates,
    showCelestialEquator: state.showCelestialEquator,
  }
}
