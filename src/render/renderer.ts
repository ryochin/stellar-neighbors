import type { CoordMode } from "../astro/coordinates"
import type { UnitMode } from "../astro/units"
import { relativePosition } from "../astro/visibility"
import type { Star, Vec3 } from "../catalog/types"
import { getActiveStars, type AppState, type LabelMode } from "../state/app-state"

export interface RenderStar {
  star: Star
  /** Observer-relative position in the current frame, ly. */
  pos: Vec3
}

export interface RenderView {
  stars: RenderStar[]
  observer: Star
  selected: Star | null
  coordMode: CoordMode
  unitMode: UnitMode
  labelMode: LabelMode
  showGrid: boolean
  showGalacticPlane: boolean
}

export interface RendererCallbacks {
  onStarClick(star: Star): void
  onStarHover(star: Star | null, screenX: number, screenY: number): void
}

export interface StarRenderer {
  mount(container: HTMLElement): void
  update(view: RenderView): void
  resetView(mode: CoordMode): void
  lookFromGalacticPole(): void
  resize(): void
  dispose(): void
}

export function buildRenderView(state: AppState): RenderView {
  return {
    stars: getActiveStars(state).map((star) => ({
      star,
      pos: relativePosition(star, state.observer, state.coordMode),
    })),
    observer: state.observer,
    selected: state.selected,
    coordMode: state.coordMode,
    unitMode: state.unitMode,
    labelMode: state.labelMode,
    showGrid: state.showGrid,
    showGalacticPlane: state.showGalacticPlane,
  }
}
