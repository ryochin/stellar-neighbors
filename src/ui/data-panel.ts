import { CUBE_SPAN_LY } from "../astro/visibility"
import type { I18n } from "../i18n/i18n"
import { getActiveStars, hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml } from "./dom"

const KEYS = ["stars", "observer", "unitMode", "maxRadius", "loadStatus"] as const

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

  // The star count already shows in the stat bar, so the status line is only for loading and errors.
  const statusText = ({ loadStatus }: AppState): string => {
    if (loadStatus.kind === "loading") return t.dataPanel.loading
    if (loadStatus.kind === "error") return t.dataPanel.loadFailed(loadStatus.reason)
    return ""
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
    status.textContent = statusText(state)
    status.hidden = state.loadStatus.kind === "ready"
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
}
