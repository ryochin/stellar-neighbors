import { observerDistance } from "../astro/visibility"
import { displayName, secondaryName } from "../catalog/display-name"
import type { Star } from "../catalog/types"
import type { I18n } from "../i18n/i18n"
import type { AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml } from "./dom"

export function createTooltip(store: Store<AppState>, i18n: I18n) {
  const tooltip = byId("tooltip")
  return {
    show(star: Star | null, x: number, y: number): void {
      if (!star) {
        tooltip.classList.remove("visible")
        return
      }
      const { observer, unitMode } = store.getState()
      const english = secondaryName(star)
      const distance = i18n.formatDistance(observerDistance(star, observer), unitMode)
      tooltip.innerHTML = `<strong>${escapeHtml(displayName(star))}</strong><small>${english ? `<span lang="en">${escapeHtml(english)}</span> · ` : ""}${i18n.t.tooltip.distanceFromHere(distance)}</small>`
      const stage = tooltip.parentElement ?? document.body
      tooltip.style.left = `${Math.min(stage.clientWidth - 225, x + 13)}px`
      tooltip.style.top = `${Math.min(stage.clientHeight - 70, y + 13)}px`
      tooltip.classList.add("visible")
    },
  }
}
