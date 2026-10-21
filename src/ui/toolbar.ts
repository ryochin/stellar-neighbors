import { UNITS } from "../astro/units"
import type { StarRenderer } from "../render/renderer"
import { hasChanged, type AppActions, type AppState, type LabelMode } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml } from "./dom"

const AXIS_HINT = "X: galactic center (l = 0°) · Y: l = 90° · Z: north galactic pole (b = +90°)"

const LABEL_TEXT: Record<LabelMode, string> = {
  major: "Labels: Major",
  all: "Labels: All",
  none: "Labels: None",
}

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
  camera: Pick<StarRenderer, "resetView" | "lookFromGalacticPole">,
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
  byId("galview").addEventListener("click", () => camera.lookFromGalacticPole())
  byId("reset").addEventListener("click", () => camera.resetView())

  const render = (state: AppState): void => {
    const { label: unit, name: unitName } = UNITS[state.unitMode]
    equator.textContent = `Celestial equator: ${state.showCelestialEquator ? "ON" : "OFF"}`
    equator.classList.toggle("active", state.showCelestialEquator)
    units.textContent = `Units: ${unit}`
    units.title = `Switch the distance unit (now: ${unitName})`
    labels.textContent = LABEL_TEXT[state.labelMode]
    labels.classList.toggle("active", state.labelMode !== "none")
    grid.classList.toggle("active", state.showGrid)
    galactic.textContent = `Galactic plane: ${state.showGalacticPlane ? "ON" : "OFF"}`
    galactic.classList.toggle("active", state.showGalacticPlane)
    const equatorLegend = state.showCelestialEquator
      ? ` · <span style="color:#c9b2ff">▱ CELESTIAL EQUATOR (δ=0°)</span>`
      : ""
    legend.innerHTML = `GALACTIC COORDINATES · <span style="color:#56dfea">● ${escapeHtml(state.observer.name)}</span> · <span style="color:#80d9ce">▱ GALACTIC PLANE (b=0°)</span>${equatorLegend} · UNITS: ${unit}`
    hint.innerHTML = `${AXIS_HINT}<br>Galactic plane: b = 0° / Galactic center: l = 0° / Distances in ${unit}`
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
}
