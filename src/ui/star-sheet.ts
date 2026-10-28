import { observerDistance } from "../astro/visibility"
import { displayName, secondaryName } from "../catalog/display-name"
import type { I18n } from "../i18n/i18n"
import { hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { observeButton, type ObserveButton } from "./detail-panel"
import { byId, escapeHtml } from "./dom"

const KEYS = ["selected", "observer", "unitMode"] as const

export interface StarSheet {
  open(): void
  close(): void
}

/**
 * Summary of the selected star over the bottom of the stage, so a phone user can read it without
 * scrolling away from the map. CSS shows it only on narrow screens.
 */
export function mountStarSheet(store: Store<AppState>, actions: AppActions, i18n: I18n): StarSheet {
  const t = i18n.t
  const sheet = byId("starSheet")
  let isOpen = false

  sheet.addEventListener("click", (e) => {
    const action: string | undefined = (e.target as Element).closest<HTMLElement>("[data-action]")
      ?.dataset.action
    const selected = store.getState().selected
    if (action === "observe" && selected) actions.setObserver(selected)
    else if (action === "close") close()
    else if (action === "details") {
      close()
      const smooth: boolean = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      byId("selected").scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" })
    }
  })

  function render(state: AppState): void {
    const star = state.selected
    sheet.hidden = !isOpen || !star
    if (!isOpen || !star) return
    const { observer, unitMode } = state
    const english = secondaryName(star)
    const distance: string = i18n.formatDistance(observerDistance(star, observer), unitMode)
    const button: ObserveButton = observeButton(star, state, i18n)
    sheet.innerHTML = `<button class="sheet-close" type="button" data-action="close" aria-label="${escapeHtml(t.sheet.close)}">×</button>
<header><span class="dot" style="--c:${star.color}"></span>${escapeHtml(displayName(star))}${english ? `<small lang="en">${escapeHtml(english)}</small>` : ""}</header>
<dl>
<div><dt>${escapeHtml(t.detail.distanceFrom(displayName(observer)))}</dt><dd>${distance}</dd></div>
<div><dt>${t.detail.spectralType}</dt><dd>${star.spectralType ? escapeHtml(star.spectralType) : "—"}</dd></div>
</dl>
<div class="sheet-actions">
<button class="focus-button" type="button" data-action="observe" ${button.disabled ? "disabled" : ""}>${button.text}</button>
<button class="mini-button" type="button" data-action="details">${t.sheet.details}</button>
</div>`
  }

  function open(): void {
    isOpen = true
    render(store.getState())
  }

  function close(): void {
    isOpen = false
    render(store.getState())
  }

  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
  return { open, close }
}
