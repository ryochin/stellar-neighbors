import { formatDistance } from "../astro/units"
import { observerDistance } from "../astro/visibility"
import type { Star } from "../catalog/types"
import type { AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml, secondaryName } from "./dom"

export function createTooltip(store: Store<AppState>) {
  const tooltip = byId("tooltip")
  return {
    show(star: Star | null, x: number, y: number): void {
      if (!star) {
        tooltip.classList.remove("visible")
        return
      }
      const { observer, unitMode } = store.getState()
      const ja = secondaryName(star)
      const distance = formatDistance(observerDistance(star, observer), unitMode)
      tooltip.innerHTML = `<strong>${escapeHtml(star.name)}</strong><small>${ja ? `<span lang="ja">${escapeHtml(ja)}</span> · ` : ""}${distance} from here</small>`
      const stage = tooltip.parentElement ?? document.body
      tooltip.style.left = `${Math.min(stage.clientWidth - 225, x + 13)}px`
      tooltip.style.top = `${Math.min(stage.clientHeight - 70, y + 13)}px`
      tooltip.classList.add("visible")
    },
  }
}
