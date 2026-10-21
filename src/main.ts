import "./styles/app.css"
import catalogUrl from "./catalog/data/stars.json?url"
import { loadCatalog } from "./catalog/loader"
import { createCanvas2dRenderer } from "./render/canvas2d/canvas2d-renderer"
import { buildRenderView } from "./render/renderer"
import { createActions, createInitialState, hasChanged, type AppState } from "./state/app-state"
import { createStore } from "./state/store"
import { mountDataPanel } from "./ui/data-panel"
import { mountDetailPanel } from "./ui/detail-panel"
import { byId } from "./ui/dom"
import { mountObserverBox } from "./ui/observer-box"
import { mountStarList } from "./ui/star-list"
import { mountToolbar } from "./ui/toolbar"
import { createTooltip } from "./ui/tooltip"

const RENDER_KEYS: readonly (keyof AppState)[] = [
  "stars",
  "observer",
  "selected",
  "coordMode",
  "unitMode",
  "labelMode",
  "showGrid",
  "showGalacticPlane",
  "maxRadius",
]

const store = createStore(createInitialState())
const actions = createActions(store)
const tooltip = createTooltip(store)
const renderer = createCanvas2dRenderer({
  onStarClick: (star) => {
    actions.selectStar(star)
    // Re-clicking the selected star leaves the state unchanged, so reveal it explicitly like legacy.
    starList.revealSelected()
  },
  onStarHover: (star, x, y) => tooltip.show(star, x, y),
})

renderer.mount(byId("stage"))
renderer.update(buildRenderView(store.getState()))
store.subscribe((state, previous) => {
  if (state.coordMode !== previous.coordMode) renderer.resetView(state.coordMode)
  if (hasChanged(state, previous, RENDER_KEYS)) renderer.update(buildRenderView(state))
})

async function loadStars(): Promise<void> {
  actions.catalogLoading()
  try {
    const catalog = await loadCatalog(catalogUrl)
    actions.catalogLoaded(catalog.stars, catalog.meta)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    actions.catalogFailed(`Could not load the star catalog: ${reason}`)
  }
}

mountToolbar(store, actions, renderer)
mountObserverBox(store, actions)
mountDataPanel(store, actions, () => void loadStars())
const starList = mountStarList(store, actions)
mountDetailPanel(store, actions)

const search = byId<HTMLInputElement>("search")
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r" && document.activeElement !== search) {
    renderer.resetView(store.getState().coordMode)
  }
})

void loadStars()
