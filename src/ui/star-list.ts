import { UNITS, formatDistance } from "../astro/units"
import { observerDistance } from "../astro/visibility"
import type { Star } from "../catalog/types"
import { getActiveStars, hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml } from "./dom"

const LIST_LIMIT = 240
const KEYS = [
  "stars",
  "observer",
  "selected",
  "coordMode",
  "unitMode",
  "maxRadius",
  "searchQuery",
] as const

// "Selected" is the focused star; "observer" is the coordinate origin. They are independent.
function renderEntry(star: Star, state: AppState): string {
  const isSelected = star === state.selected
  const isObserver = star === state.observer
  const title = `${star.name}${isSelected ? " (selected)" : ""}${isObserver ? " (observer)" : ""}`
  return `<button type="button" class="entry${isSelected ? " active" : ""}${isObserver ? " observer-entry" : ""}" data-id="${escapeHtml(star.id)}"${isSelected ? ' aria-current="true"' : ""} title="${escapeHtml(title)}"><span class="dot" style="--c:${star.color}"></span><b>${escapeHtml(star.name)}</b>${isSelected ? '<span class="focus-mark">✦ Selected</span>' : ""}${isObserver ? '<span class="observer-mark">◎</span>' : ""}<small class="distance">${formatDistance(observerDistance(star, state.observer), state.unitMode)}</small></button>`
}

export interface StarList {
  /** Scroll the selected star into view, even when the selection did not change. */
  revealSelected(): void
}

export function mountStarList(store: Store<AppState>, actions: AppActions): StarList {
  const list = byId("starlist")
  const search = byId<HTMLInputElement>("search")
  const note = byId("focusedNote")
  const sortLabel = byId("distanceSortLabel")

  search.addEventListener("input", () => actions.setSearchQuery(search.value))
  list.addEventListener("click", (e) => {
    const button = (e.target as Element).closest<HTMLElement>(".entry")
    if (!button) return
    const star = store.getState().stars.find((s) => s.id === button.dataset.id)
    if (star) actions.selectStar(star)
  })

  function revealSelected(state: AppState): void {
    if (!state.selected) return
    const id = state.selected.id
    const row = Array.from(list.querySelectorAll<HTMLElement>(".entry")).find(
      (b) => b.dataset.id === id,
    )
    if (!row) return
    // Scroll only the list itself, not the whole sidebar.
    const target =
      row.getBoundingClientRect().top -
      list.getBoundingClientRect().top +
      list.scrollTop -
      (list.clientHeight - row.offsetHeight) / 2
    list.scrollTop = Math.max(0, Math.min(list.scrollHeight - list.clientHeight, target))
    // Bring the list into view when it sits outside the visible part of the sidebar.
    const side = list.closest<HTMLElement>(".side")
    if (!side) return
    const bounds = list.getBoundingClientRect()
    const area = side.getBoundingClientRect()
    if (bounds.bottom > area.bottom - 14) side.scrollTop += bounds.bottom - area.bottom + 18
    else if (bounds.top < area.top + 14) side.scrollTop -= area.top + 14 - bounds.top
  }

  function render(state: AppState, reveal: boolean): void {
    const query = state.searchQuery.toLowerCase().trim()
    const active = getActiveStars(state)
    const sorted = active
      .filter((s) =>
        [s.name, s.nameJa, s.catalogLabel].some((text) => text.toLowerCase().includes(query)),
      )
      .map((star) => ({ star, distance: observerDistance(star, state.observer) }))
      .sort((a, b) => a.distance - b.distance)
      .map(({ star }) => star)
    const first = sorted.slice(0, LIST_LIMIT)
    const selected = state.selected
    // Pin the focused star when it falls outside the first page or the search results.
    const pinned = selected !== null && active.includes(selected) && !first.includes(selected)
    const pinnedHtml = pinned
      ? `<div class="pinned-heading">✦ Selected ${sorted.includes(selected) ? `(beyond the first ${LIST_LIMIT})` : "(not in the search results)"}</div>${renderEntry(selected, state)}<div class="pinned-divider"></div>`
      : ""
    const entries = first.map((star) => renderEntry(star, state)).join("")
    list.innerHTML =
      pinnedHtml + entries || '<p style="font-size:12px;color:#8ba7bc">No matching stars</p>'
    if (sorted.length > LIST_LIMIT) {
      list.insertAdjacentHTML(
        "beforeend",
        `<div class="small-note">${(sorted.length - LIST_LIMIT).toLocaleString("en-US")} more. Narrow down by name or catalog ID.</div>`,
      )
    }
    sortLabel.textContent = `By distance from the observer (${UNITS[state.unitMode].label})`
    note.innerHTML = `✦ Selected: <strong>${selected ? escapeHtml(selected.name) : "—"}</strong>&emsp;<span class="legend-item">◎ Observer: ${escapeHtml(state.observer.name)}</span>`
    if (reveal) revealSelected(state)
  }

  render(store.getState(), false)
  store.subscribe((state, previous) => {
    if (!hasChanged(state, previous, KEYS)) return
    // Like the legacy page, scroll to the selection only when the user picks a star or observer,
    // not when the catalog finishes loading and replaces the placeholder Sun.
    const userMoved = state.selected !== previous.selected || state.observer !== previous.observer
    render(state, state.stars === previous.stars && userMoved)
  })
  return { revealSelected: () => revealSelected(store.getState()) }
}
