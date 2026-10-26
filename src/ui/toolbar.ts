import { displayName } from "../catalog/display-name"
import type { I18n } from "../i18n/i18n"
import type { StarRenderer } from "../render/renderer"
import { hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml } from "./dom"

const KEYS = [
  "unitMode",
  "labelMode",
  "showGrid",
  "showGalacticPlane",
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
  const grid = byId("grid")
  const galactic = byId("galactic")
  const legend = byId("legend")
  const hint = byId("hint")

  equator.addEventListener("click", () => actions.toggleCelestialEquator())
  units.addEventListener("click", () => actions.cycleUnitMode())
  labels.addEventListener("click", () => actions.cycleLabelMode())
  grid.addEventListener("click", () => actions.toggleGrid())
  galactic.addEventListener("click", () => actions.toggleGalacticPlane())
  byId("reset").addEventListener("click", () => camera.resetView())

  const render = (state: AppState): void => {
    const { label: unit, name: unitName } = t.units[state.unitMode]
    const bar = t.toolbar
    equator.textContent = bar.celestialEquator(state.showCelestialEquator)
    equator.classList.toggle("active", state.showCelestialEquator)
    units.textContent = bar.units(unit)
    units.title = bar.unitsTitle(unitName)
    labels.textContent = bar.labels[state.labelMode]
    labels.classList.toggle("active", state.labelMode !== "none")
    grid.classList.toggle("active", state.showGrid)
    galactic.textContent = bar.galacticPlane(state.showGalacticPlane)
    galactic.classList.toggle("active", state.showGalacticPlane)
    const equatorLegend = state.showCelestialEquator
      ? ` · <span style="color:#c9b2ff">▱ ${bar.legendCelestialEquator}</span>`
      : ""
    legend.innerHTML = `${bar.legendFrame} · <span style="color:#56dfea">● ${escapeHtml(displayName(state.observer))}</span> · <span style="color:#80d9ce">▱ ${bar.legendGalacticPlane}</span>${equatorLegend} · <span style="white-space:nowrap">${bar.legendUnits(unit)}</span>`
    hint.innerHTML = `${bar.axisHint}<br>${bar.planeHint(unit)}`
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
}
