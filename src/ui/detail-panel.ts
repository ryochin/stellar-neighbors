import { MAX_OBSERVER_DISTANCE_LY, canObserveFrom, observerDistance } from "../astro/visibility"
import { catalogIdList, otherDesignations } from "../catalog/aliases"
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
    // The Sun sits at the origin, so it has no direction to give angles for.
    const hasDirection = star.l !== null
    // From the Sun, the observer distance already is the distance from the Sun.
    const observingFromSun = observer.distLy === 0
    const signed = (deg: number): string => `${deg >= 0 ? "+" : ""}${deg.toFixed(1)}°`
    const list = (items: string[]): string => items.map(escapeHtml).join(" · ")
    const designations = otherDesignations(star, i18n.locale)
    const catalogIds = catalogIdList(star.catalogIds)
    panel.innerHTML = `<header><span class="dot" style="--c:${star.color}"></span>${escapeHtml(displayName(star))}</header>
${subtitle ? `<p>${subtitle}</p>` : ""}
<div class="kv">
<div class="primary-distance${observingFromSun ? " wide" : ""}"><small>${escapeHtml(t.distanceFrom(displayName(observer)))}</small><strong>${fmt(observerDistance(star, observer))}</strong></div>
${observingFromSun ? "" : `<div><small>${t.distanceFromSun}</small><strong>${fmt(star.distLy)}</strong></div>`}
<div><small>${t.galacticLongitude}</small><strong>${star.l === null ? "—" : `${star.l.toFixed(1)}°`}</strong></div>
<div><small>${t.galacticLatitude}</small><strong>${star.b === null ? "—" : signed(star.b)}</strong></div>
<div><small>${t.rightAscension}</small><strong>${hasDirection ? `${star.raH.toFixed(2)} h` : "—"}</strong></div>
<div><small>${t.declination}</small><strong>${hasDirection ? signed(star.decDeg) : "—"}</strong></div>
<div><small>${t.spectralType}</small><strong>${star.spec ? escapeHtml(star.spec) : "—"}</strong></div>
<div><small>${t.apparentMagnitude}</small><strong>${star.mag === null ? "—" : star.mag.toFixed(2)}</strong></div>
${designations.length > 0 ? `<div class="wide aliases"><small>${t.designations}</small><strong>${list(designations)}</strong></div>` : ""}
<div class="wide aliases"><small>${t.catalogIds}</small><strong>${catalogIds.length > 0 ? list(catalogIds) : "—"}</strong></div>
</div>
<button id="focusSelected" type="button" class="focus-button" ${atOrigin || !canTravel ? "disabled" : ""}>${buttonText}</button>`
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
}
