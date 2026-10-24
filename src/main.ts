import "./styles/app.css"
import namesJaUrl from "./catalog/data/names.ja.json?url"
import catalogUrl from "./catalog/data/stars.json?url"
import { loadCatalog, loadLocalNames, rowToStar, withLocalNames } from "./catalog/loader"
import { SUN_ROW } from "./catalog/sun"
import { applyDocumentTranslations } from "./i18n/document"
import { createI18n } from "./i18n/i18n"
import { resolveLocale, type Locale } from "./i18n/locales"
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
  "unitMode",
  "labelMode",
  "showGrid",
  "showGalacticPlane",
  "showCelestialEquator",
  "maxRadius",
]

// English names are built into the catalog; other locales load their own names table.
const LOCAL_NAMES_URLS: Partial<Record<Locale, string>> = { ja: namesJaUrl }

const locale = resolveLocale(location.search, navigator.languages)
const i18n = createI18n(locale)
applyDocumentTranslations(document, locale, i18n.t)

const englishSun = rowToStar(SUN_ROW)
const placeholderSun = locale === "en" ? englishSun : { ...englishSun, localName: i18n.t.sun }

const store = createStore(createInitialState(placeholderSun))
const actions = createActions(store)
const tooltip = createTooltip(store, i18n)
const renderer = createCanvas2dRenderer(
  {
    onStarClick: (star) => {
      actions.selectStar(star)
      // Re-clicking the selected star leaves the state unchanged, so reveal it explicitly like legacy.
      starList.revealSelected()
    },
    onStarHover: (star, x, y) => tooltip.show(star, x, y),
    onStarDoubleClick: (star) => actions.observeStar(star),
  },
  i18n,
)

// Back to the start-up view: observe from the Sun, select it and restore the camera.
function resetAll(): void {
  actions.returnToSun()
  renderer.resetView()
}

renderer.mount(byId("stage"))
renderer.update(buildRenderView(store.getState()))
store.subscribe((state, previous) => {
  if (hasChanged(state, previous, RENDER_KEYS)) renderer.update(buildRenderView(state))
})

async function loadStars(): Promise<void> {
  actions.catalogLoading()
  try {
    const namesUrl = LOCAL_NAMES_URLS[locale]
    const [catalog, names] = await Promise.all([
      loadCatalog(catalogUrl),
      namesUrl ? loadLocalNames(namesUrl, locale) : null,
    ])
    const stars = names ? withLocalNames(catalog.stars, names, locale) : catalog.stars
    actions.catalogLoaded(stars, catalog.meta)
  } catch (error) {
    actions.catalogFailed(error instanceof Error ? error.message : String(error))
  }
}

mountToolbar(
  store,
  actions,
  {
    resetView: resetAll,
    lookFromGalacticPole: () => renderer.lookFromGalacticPole(),
  },
  i18n,
)
mountObserverBox(store, actions)
mountDataPanel(store, actions, () => void loadStars(), i18n)
const starList = mountStarList(store, actions, i18n)
mountDetailPanel(store, actions, i18n)

const search = byId<HTMLInputElement>("search")
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r" && document.activeElement !== search) {
    resetAll()
  }
})

void loadStars()
