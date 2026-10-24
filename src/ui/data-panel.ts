import { CUBE_SPAN_LY } from "../astro/visibility"
import { displayName } from "../catalog/display-name"
import type { I18n } from "../i18n/i18n"
import { getActiveStars, hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml } from "./dom"

const KEYS = ["stars", "observer", "unitMode", "maxRadius", "loadStatus", "catalogMeta"] as const

export function mountDataPanel(
  store: Store<AppState>,
  actions: AppActions,
  onRetry: () => void,
  i18n: I18n,
): void {
  const { t } = i18n
  const starCount = byId("starCount")
  const cubeSpan = byId("cubeSpanValue")
  const status = byId("dataStatus")
  const retry = byId<HTMLButtonElement>("retryLoad")
  const range = byId<HTMLInputElement>("distanceRange")
  const rangeValue = byId("distanceValue")

  range.addEventListener("input", () => actions.setMaxRadius(Number(range.value)))
  retry.addEventListener("click", onRetry)

  const statusText = (state: AppState, count: string, maxRadius: string): string => {
    const { loadStatus } = state
    if (loadStatus.kind === "loading") return t.dataPanel.loading
    if (loadStatus.kind === "error") return t.dataPanel.loadFailed(loadStatus.reason)
    const source = state.catalogMeta?.source ?? t.dataPanel.catalog
    return t.dataPanel.ready(source, count, displayName(state.observer), maxRadius)
  }

  const render = (state: AppState): void => {
    const count = i18n.formatInteger(getActiveStars(state).length)
    const maxRadius = i18n.formatDistance(state.maxRadius, state.unitMode)
    const span = i18n.distanceParts(CUBE_SPAN_LY, state.unitMode)
    starCount.textContent = count
    cubeSpan.innerHTML = `${span.value} <small style="display:inline">${escapeHtml(span.unit)}</small>`
    range.value = String(state.maxRadius)
    rangeValue.textContent = maxRadius
    retry.hidden = state.loadStatus.kind !== "error"
    status.classList.toggle("warn", state.loadStatus.kind === "error")
    status.textContent = statusText(state, count, maxRadius)
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
}
