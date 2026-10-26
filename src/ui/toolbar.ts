import { displayName } from "../catalog/display-name"
import type { I18n } from "../i18n/i18n"
import type { StarRenderer } from "../render/renderer"
import { hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml } from "./dom"

const KEYS = [
  "unitMode",
  "labelMode",
  "showCoordinates",
  "showCelestialEquator",
  "observer",
] as const

export function mountToolbar(
  store: Store<AppState>,
  actions: AppActions,
  camera: Pick<StarRenderer, "resetView">,
  { t }: I18n,
): void {
  const equator = byId("equator")
  const units = byId("units")
  const labels = byId("labels")
  const coordinates = byId("coordinates")
  const legend = byId("legend")

  equator.addEventListener("click", () => actions.toggleCelestialEquator())
  units.addEventListener("click", () => actions.cycleUnitMode())
  labels.addEventListener("click", () => actions.cycleLabelMode())
  coordinates.addEventListener("click", () => actions.toggleCoordinates())
  byId("reset").addEventListener("click", () => camera.resetView())
  equator.textContent = t.toolbar.celestialEquator
  coordinates.textContent = t.toolbar.coordinates

  const render = (state: AppState): void => {
    const { label: unit, name: unitName } = t.units[state.unitMode]
    const bar = t.toolbar
    setToggle(equator, state.showCelestialEquator)
    units.textContent = bar.units(unit)
    units.title = bar.unitsTitle(unitName)
    labels.textContent = bar.labels[state.labelMode]
    labels.classList.toggle("active", state.labelMode !== "none")
    setToggle(coordinates, state.showCoordinates)
    legend.innerHTML = `${bar.legendFrame} · <span style="color:#56dfea;white-space:nowrap">● ${bar.legendObserver} ${escapeHtml(displayName(state.observer))}</span>`
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
}

function setToggle(button: HTMLElement, on: boolean): void {
  button.classList.toggle("active", on)
  button.setAttribute("aria-pressed", String(on))
}
