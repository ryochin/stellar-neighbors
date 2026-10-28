import { formatDeclination, formatRightAscension } from "../astro/sexagesimal"
import { MAX_OBSERVER_DISTANCE_LY, canObserveFrom, observerDistance } from "../astro/visibility"
import { catalogIdList, otherDesignations } from "../catalog/aliases"
import { displayName, secondaryName } from "../catalog/display-name"
import type { Star } from "../catalog/types"
import { wikipediaUrl } from "../catalog/wikipedia"
import type { I18n } from "../i18n/i18n"
import { hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml } from "./dom"
// Wikipedia's "W" mark from Wikimedia Commons, unmodified (trademark policy allows it on links).
import wikipediaIconUrl from "./icons/wikipedia-w.svg"

const KEYS = ["selected", "observer", "unitMode", "wikipediaArticles"] as const

export interface ObserveButton {
  text: string
  disabled: boolean
}

/** Label and state of the "observe from this star" button, shared with the star sheet. */
export function observeButton(star: Star, state: AppState, i18n: I18n): ObserveButton {
  const t = i18n.t.detail
  if (star === state.observer) return { text: t.observingFromHere, disabled: true }
  if (!canObserveFrom(star)) {
    const limit: string = i18n.formatDistance(MAX_OBSERVER_DISTANCE_LY, state.unitMode)
    return { text: t.outOfRange(limit), disabled: true }
  }
  return { text: t.observeFromHere, disabled: false }
}

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
    const fmt = (ly: number): string => i18n.formatDistance(ly, unitMode)
    const button: ObserveButton = observeButton(star, state, i18n)
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
    const article = state.wikipediaArticles?.get(star.id)
    // The wordmark stays "Wikipedia" in every locale, as the trademark policy asks.
    const wikipediaContent = `<span class="wikipedia-icon"><img src="${wikipediaIconUrl}" alt=""></span>Wikipedia`
    // A disabled look instead of no link, so the panel layout does not jump between stars.
    const wikipediaLink = article
      ? `<a class="wikipedia-link" href="${escapeHtml(wikipediaUrl(article))}" hreflang="${escapeHtml(article[0])}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(t.openWikipedia)}">${wikipediaContent}</a>`
      : `<span class="wikipedia-link" aria-disabled="true" title="${escapeHtml(t.noWikipediaArticle)}">${wikipediaContent}</span>`
    panel.innerHTML = `<header><span class="dot" style="--c:${star.color}"></span>${escapeHtml(displayName(star))}</header>
${subtitle ? `<p>${subtitle}</p>` : ""}
<div class="kv">
<div class="primary-distance${observingFromSun ? " wide" : ""}"><small>${escapeHtml(t.distanceFrom(displayName(observer)))}</small><strong>${fmt(observerDistance(star, observer))}</strong></div>
${observingFromSun ? "" : `<div><small>${t.distanceFromSun}</small><strong>${fmt(star.distLy)}</strong></div>`}
<div><small>${t.galacticLongitude}</small><strong>${star.l === null ? "—" : `${star.l.toFixed(1)}°`}</strong></div>
<div><small>${t.galacticLatitude}</small><strong>${star.b === null ? "—" : signed(star.b)}</strong></div>
<div><small>${t.rightAscension}</small><strong>${hasDirection ? formatRightAscension(star.raH) : "—"}</strong></div>
<div><small>${t.declination}</small><strong>${hasDirection ? formatDeclination(star.decDeg) : "—"}</strong></div>
<div><small>${t.spectralType}</small><strong>${star.spectralType ? escapeHtml(star.spectralType) : "—"}</strong></div>
<div><small>${t.apparentMagnitude}</small><strong>${star.mag === null ? "—" : star.mag.toFixed(2)}</strong></div>
${designations.length > 0 ? `<div class="wide aliases"><small>${t.designations}</small><strong>${list(designations)}</strong></div>` : ""}
<div class="wide aliases"><small>${t.catalogIds}</small><strong>${catalogIds.length > 0 ? list(catalogIds) : "—"}</strong></div>
</div>
<div class="detail-actions">
<button id="focusSelected" type="button" class="focus-button" ${button.disabled ? "disabled" : ""}>${button.text}</button>
${wikipediaLink}
</div>`
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
}
