import { MAX_OBSERVER_DISTANCE_LY, canObserveFrom, observerDistance } from "../astro/visibility"
import { displayName, secondaryName } from "../catalog/display-name"
import type { I18n } from "../i18n/i18n"
import { hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml } from "./dom"

const KEYS = ["selected", "observer", "unitMode"] as const

export function mountDetailPanel(store: Store<AppState>, actions: AppActions, i18n: I18n): void {
  const t = i18n.t.detail
  const panel = byId("selected")
  panel.addEventListener("click", (e) => {
    const selected = store.getState().selected
    if ((e.target as Element).closest("#focusSelected") && selected) actions.setObserver(selected)
  })

  const render = (state: AppState): void => {
    const star = state.selected
    if (!star) {
      panel.textContent = t.empty
      return
    }
    const { observer, unitMode } = state
    const atOrigin = star === observer
    const canTravel = canObserveFrom(star)
    const fmt = (ly: number): string => i18n.formatDistance(ly, unitMode)
    const buttonText = atOrigin
      ? t.observingFromHere
      : !canTravel
        ? t.outOfRange(fmt(MAX_OBSERVER_DISTANCE_LY))
        : t.observeFromHere
    const english = secondaryName(star)
    const subtitle = [
      english && `<span lang="en">${escapeHtml(english)}</span>`,
      atOrigin && t.currentObserver,
    ]
      .filter(Boolean)
      .join(" · ")
    panel.innerHTML = `<header><span class="dot" style="--c:${star.color}"></span>${escapeHtml(displayName(star))}</header>
${subtitle ? `<p>${subtitle}</p>` : ""}
<div class="kv">
<div class="primary-distance"><small>${escapeHtml(t.distanceFrom(displayName(observer)))}</small><strong>${fmt(observerDistance(star, observer))}</strong></div>
<div><small>${t.distanceFromSun}</small><strong>${fmt(star.distLy)}</strong></div>
<div><small>${t.galacticLongitude}</small><strong>${star.l === null ? "—" : `${star.l.toFixed(1)}°`}</strong></div>
<div><small>${t.galacticLatitude}</small><strong>${star.b === null ? "—" : `${star.b >= 0 ? "+" : ""}${star.b.toFixed(1)}°`}</strong></div>
<div><small>${t.rightAscension}</small><strong>${star.raH.toFixed(2)} h</strong></div>
<div><small>${t.spectralType}</small><strong>${star.spec ? escapeHtml(star.spec) : "—"}</strong></div>
<div><small>${t.catalogId}</small><strong>${escapeHtml(star.catalogLabel || "—")}</strong></div>
<div><small>${t.apparentMagnitude}</small><strong>${star.mag === null ? "—" : star.mag.toFixed(2)}</strong></div>
</div>
<button id="focusSelected" type="button" class="focus-button" ${atOrigin || !canTravel ? "disabled" : ""}>${buttonText}</button>`
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
}
