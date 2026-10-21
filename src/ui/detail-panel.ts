import { formatDistance } from "../astro/units"
import { MAX_OBSERVER_DISTANCE_LY, canObserveFrom, observerDistance } from "../astro/visibility"
import { hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml, secondaryName } from "./dom"

const KEYS = ["selected", "observer", "unitMode"] as const

export function mountDetailPanel(store: Store<AppState>, actions: AppActions): void {
  const panel = byId("selected")
  panel.addEventListener("click", (e) => {
    const selected = store.getState().selected
    if ((e.target as Element).closest("#focusSelected") && selected) actions.setObserver(selected)
  })

  const render = (state: AppState): void => {
    const star = state.selected
    if (!star) {
      panel.textContent = "No stars to show"
      return
    }
    const { observer, unitMode } = state
    const atOrigin = star === observer
    const canTravel = canObserveFrom(star)
    const fmt = (ly: number): string => formatDistance(ly, unitMode)
    const buttonText = atOrigin
      ? "Observing from this star"
      : !canTravel
        ? `Out of range (over ${fmt(MAX_OBSERVER_DISTANCE_LY)} from the Sun)`
        : "✧ Observe from this star"
    const ja = secondaryName(star)
    const subtitle = [
      ja && `<span lang="ja">${escapeHtml(ja)}</span>`,
      atOrigin && "current observer",
    ]
      .filter(Boolean)
      .join(" · ")
    panel.innerHTML = `<header><span class="dot" style="--c:${star.color}"></span>${escapeHtml(star.name)}</header>
${subtitle ? `<p>${subtitle}</p>` : ""}
<div class="kv">
<div class="primary-distance"><small>Distance from ${escapeHtml(observer.name)}</small><strong>${fmt(observerDistance(star, observer))}</strong></div>
<div><small>Distance from the Sun</small><strong>${fmt(star.distLy)}</strong></div>
<div><small>Galactic longitude l (from the Sun)</small><strong>${star.l === null ? "—" : `${star.l.toFixed(1)}°`}</strong></div>
<div><small>Galactic latitude b (from the Sun)</small><strong>${star.b === null ? "—" : `${star.b >= 0 ? "+" : ""}${star.b.toFixed(1)}°`}</strong></div>
<div><small>Right ascension (J2000, from the Sun)</small><strong>${star.raH.toFixed(2)} h</strong></div>
<div><small>Spectral type (approx.)</small><strong>${star.spec ? escapeHtml(star.spec) : "—"}</strong></div>
<div><small>Catalog ID</small><strong>${escapeHtml(star.catalogLabel || "—")}</strong></div>
<div><small>Apparent magnitude (from Earth)</small><strong>${star.mag === null ? "—" : star.mag.toFixed(2)}</strong></div>
</div>
<button id="focusSelected" type="button" class="focus-button" ${atOrigin || !canTravel ? "disabled" : ""}>${buttonText}</button>`
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, KEYS)) render(state)
  })
}
