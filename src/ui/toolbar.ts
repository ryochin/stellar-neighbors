import type { CoordMode } from "../astro/coordinates"
import { UNITS } from "../astro/units"
import type { StarRenderer } from "../render/renderer"
import { hasChanged, type AppActions, type AppState, type LabelMode } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml } from "./dom"

const COORD_MODES: Record<CoordMode, { label: string; legend: string; hint: string }> = {
  gal: {
    label: "Galactic",
    legend: "GALACTIC COORDINATES",
    hint: "X: galactic center (l = 0°) · Y: l = 90° · Z: north galactic pole (b = +90°)",
  },
  eq: {
    label: "Equatorial",
    legend: "J2000 EQUATORIAL",
    hint: "X: vernal equinox (RA 0h) · Y: RA 6h · Z: north celestial pole",
  },
}

const LABEL_TEXT: Record<LabelMode, string> = {
  major: "Labels: Major",
  all: "Labels: All",
  none: "Labels: None",
}

const KEYS = [
  "coordMode",
  "unitMode",
  "labelMode",
  "showGrid",
  "showGalacticPlane",
  "observer",
] as const

export function mountToolbar(
  store: Store<AppState>,
  actions: AppActions,
  camera: Pick<StarRenderer, "resetView" | "lookFromGalacticPole">,
): void {
  const coords = byId("coords")
  const units = byId("units")
  const labels = byId("labels")
  const grid = byId("grid")
  const galactic = byId("galactic")
  const legend = byId("legend")
  const hint = byId("hint")

  coords.addEventListener("click", () => actions.toggleCoordMode())
  units.addEventListener("click", () => actions.cycleUnitMode())
  labels.addEventListener("click", () => actions.cycleLabelMode())
  grid.addEventListener("click", () => actions.toggleGrid())
  galactic.addEventListener("click", () => actions.toggleGalacticPlane())
  byId("galview").addEventListener("click", () => camera.lookFromGalacticPole())
  byId("reset").addEventListener("click", () => camera.resetView(store.getState().coordMode))

  const render = (state: AppState): void => {
    const mode = COORD_MODES[state.coordMode]
    const unit = UNITS[state.unitMode].label
    coords.textContent = `Frame: ${mode.label}`
    units.textContent = `Units: ${unit}`
    labels.textContent = LABEL_TEXT[state.labelMode]
    labels.classList.toggle("active", state.labelMode !== "none")
    grid.classList.toggle("active", state.showGrid)
    galactic.textContent = `Galactic plane: ${state.showGalacticPlane ? "ON" : "OFF"}`
    galactic.classList.toggle("active", state.showGalacticPlane)
    legend.innerHTML = `${mode.legend} · <span style="color:#56dfea">● ${escapeHtml(state.observer.name)}</span> · <span style="color:#80d9ce">▱ GALACTIC PLANE (b=0°)</span> · UNITS: ${unit}`
    hint.innerHTML = `${mode.hint}<br>Galactic plane: b = 0° / Galactic center: l = 0° / Distances in ${unit}`
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
}
