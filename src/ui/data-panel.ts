import { formatDistance } from "../astro/units"
import { CUBE_SPAN_LY } from "../astro/visibility"
import { getActiveStars, hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId } from "./dom"

const KEYS = [
  "stars",
  "observer",
  "coordMode",
  "unitMode",
  "maxRadius",
  "loadStatus",
  "catalogMeta",
] as const

export function mountDataPanel(
  store: Store<AppState>,
  actions: AppActions,
  onRetry: () => void,
): void {
  const starCount = byId("starCount")
  const cubeSpan = byId("cubeSpanValue")
  const status = byId("dataStatus")
  const retry = byId<HTMLButtonElement>("retryLoad")
  const range = byId<HTMLInputElement>("distanceRange")
  const rangeValue = byId("distanceValue")

  range.addEventListener("input", () => actions.setMaxRadius(Number(range.value)))
  retry.addEventListener("click", onRetry)

  const render = (state: AppState): void => {
    const count = getActiveStars(state).length.toLocaleString("en-US")
    const maxRadius = formatDistance(state.maxRadius, state.unitMode)
    starCount.textContent = count
    cubeSpan.innerHTML = `${formatDistance(CUBE_SPAN_LY, state.unitMode).replace(" ", ' <small style="display:inline">')}</small>`
    range.value = String(state.maxRadius)
    rangeValue.textContent = maxRadius
    retry.hidden = state.loadStatus.kind !== "error"
    status.classList.toggle("warn", state.loadStatus.kind === "error")
    status.textContent =
      state.loadStatus.kind === "ready"
        ? `${state.catalogMeta?.source ?? "Catalog"}: ${count} stars shown / observer: ${state.observer.name} / max distance ${maxRadius}`
        : state.loadStatus.message
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
}
