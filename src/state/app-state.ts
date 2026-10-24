import { nextUnitMode, type UnitMode } from "../astro/units"
import { DEFAULT_MAX_RADIUS_LY, canObserveFrom, selectActiveStars } from "../astro/visibility"
import { rowToStar } from "../catalog/loader"
import { SUN_ROW } from "../catalog/sun"
import type { CatalogMeta, Star } from "../catalog/types"
import type { Store } from "./store"

export type LabelMode = "major" | "all" | "none"

// The UI words the status in its locale; `reason` is the developer-facing error message.
export type LoadStatus = { kind: "loading" } | { kind: "ready" } | { kind: "error"; reason: string }

export interface AppState {
  stars: Star[]
  observer: Star
  selected: Star | null
  unitMode: UnitMode
  maxRadius: number
  labelMode: LabelMode
  showGrid: boolean
  showGalacticPlane: boolean
  showCelestialEquator: boolean
  searchQuery: string
  catalogMeta: CatalogMeta | null
  loadStatus: LoadStatus
}

const LABEL_ORDER: LabelMode[] = ["major", "all", "none"]
const LOADING_STATUS: LoadStatus = { kind: "loading" }

/** `sun` is the placeholder observer until the catalog loads; main.ts names it in the UI locale. */
export function createInitialState(sun: Star = rowToStar(SUN_ROW)): AppState {
  return {
    stars: [sun],
    observer: sun,
    selected: sun,
    unitMode: "ly",
    maxRadius: DEFAULT_MAX_RADIUS_LY,
    labelMode: "major",
    showGrid: true,
    showGalacticPlane: true,
    showCelestialEquator: false,
    searchQuery: "",
    catalogMeta: null,
    loadStatus: LOADING_STATUS,
  }
}

let activeCache: {
  stars: Star[]
  observer: Star
  maxRadius: number
  value: Star[]
} | null = null

export function getActiveStars(state: AppState): Star[] {
  const { stars, observer, maxRadius } = state
  if (
    activeCache &&
    activeCache.stars === stars &&
    activeCache.observer === observer &&
    activeCache.maxRadius === maxRadius
  ) {
    return activeCache.value
  }
  const value = selectActiveStars(stars, observer, maxRadius)
  activeCache = { stars, observer, maxRadius, value }
  return value
}

export function hasChanged(
  state: AppState,
  previous: AppState,
  keys: readonly (keyof AppState)[],
): boolean {
  return keys.some((key) => state[key] !== previous[key])
}

const findSun = (stars: Star[]): Star | undefined => stars.find((star) => star.distLy === 0)

// Keep `selected` visible: current selection, else observer, else Sun, else nearest available.
function withValidSelection(state: AppState): AppState {
  const active = getActiveStars(state)
  if (state.selected && active.includes(state.selected)) return state
  const fallback = active.includes(state.observer)
    ? state.observer
    : (findSun(active) ?? active[0] ?? null)
  return { ...state, selected: fallback }
}

export function createActions(store: Store<AppState>) {
  const commit = (patch: (state: AppState) => Partial<AppState>): void =>
    store.setState((state) => withValidSelection({ ...state, ...patch(state) }))

  const setObserver = (star: Star): void => {
    if (!canObserveFrom(star)) return
    commit(() => ({ observer: star, maxRadius: DEFAULT_MAX_RADIUS_LY }))
  }

  const observeStar = (star: Star): void => {
    if (!canObserveFrom(star)) return
    commit(() => ({ selected: star, observer: star, maxRadius: DEFAULT_MAX_RADIUS_LY }))
  }

  return {
    catalogLoading: (): void => store.setState({ loadStatus: LOADING_STATUS }),
    catalogFailed: (reason: string): void =>
      store.setState({ loadStatus: { kind: "error", reason } }),
    catalogLoaded: (stars: Star[], meta: CatalogMeta): void => {
      const observer = findSun(stars) ?? stars[0]
      commit(() => ({
        stars,
        observer,
        selected: observer,
        catalogMeta: meta,
        maxRadius: DEFAULT_MAX_RADIUS_LY,
        loadStatus: { kind: "ready" },
      }))
    },
    selectStar: (star: Star): void => store.setState({ selected: star }),
    setObserver,
    observeStar,
    observeNamed: (name: string): void => {
      const star = store.getState().stars.find((s) => s.name === name || s.localName === name)
      if (star) observeStar(star)
    },
    returnToSun: (): void => {
      const sun = findSun(store.getState().stars)
      if (sun) observeStar(sun)
    },
    cycleUnitMode: (): void => store.setState((s) => ({ unitMode: nextUnitMode(s.unitMode) })),
    cycleLabelMode: (): void =>
      store.setState((s) => ({
        labelMode: LABEL_ORDER[(LABEL_ORDER.indexOf(s.labelMode) + 1) % LABEL_ORDER.length],
      })),
    toggleGrid: (): void => store.setState((s) => ({ showGrid: !s.showGrid })),
    toggleGalacticPlane: (): void =>
      store.setState((s) => ({ showGalacticPlane: !s.showGalacticPlane })),
    toggleCelestialEquator: (): void =>
      store.setState((s) => ({ showCelestialEquator: !s.showCelestialEquator })),
    setMaxRadius: (maxRadius: number): void => commit(() => ({ maxRadius })),
    setSearchQuery: (searchQuery: string): void => store.setState({ searchQuery }),
  }
}

export type AppActions = ReturnType<typeof createActions>
