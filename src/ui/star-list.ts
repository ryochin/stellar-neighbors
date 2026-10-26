import { observerDistance } from "../astro/visibility"
import { displayName } from "../catalog/display-name"
import { normalizeSearchText } from "../catalog/search-text"
import type { Star } from "../catalog/types"
import type { I18n } from "../i18n/i18n"
import { getActiveStars, hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId, escapeHtml } from "./dom"

const LIST_LIMIT = 240
const KEYS = ["stars", "observer", "selected", "unitMode", "maxRadius", "searchQuery"] as const

// "Selected" is the focused star; "observer" is the coordinate origin. They are independent.
function renderEntry(star: Star, state: AppState, i18n: I18n): string {
  const t = i18n.t.starList
  const isSelected = star === state.selected
  const isObserver = star === state.observer
  const name = displayName(star)
  const title = `${name}${isSelected ? t.selectedSuffix : ""}${isObserver ? t.observerSuffix : ""}`
  const distance = i18n.formatDistance(observerDistance(star, state.observer), state.unitMode)
  return `<button type="button" class="entry${isSelected ? " active" : ""}${isObserver ? " observer-entry" : ""}" data-id="${escapeHtml(star.id)}"${isSelected ? ' aria-current="true"' : ""} title="${escapeHtml(title)}"><span class="dot" style="--c:${star.color}"></span><b>${escapeHtml(name)}</b>${isSelected ? `<span class="focus-mark">${t.selectedMark}</span>` : ""}${isObserver ? '<span class="observer-mark">◎</span>' : ""}<small class="distance">${distance}</small></button>`
}

export interface StarList {
  /** Scroll the selected star into view, even when the selection did not change. */
  revealSelected(): void
}

export function mountStarList(store: Store<AppState>, actions: AppActions, i18n: I18n): StarList {
  const t = i18n.t.starList
  const list = byId("starlist")
  const search = byId<HTMLInputElement>("search")
  const sortLabel = byId("distanceSortLabel")

  search.addEventListener("input", () => actions.setSearchQuery(search.value))
  // The first click re-renders the rows and scrolls the selection to the middle, so no dblclick
  // fires and the second click may land on another row: observe the star of the first click.
  let firstClickStar: Star | undefined
  list.addEventListener("click", (e) => {
    if (e.detail === 2) {
      if (firstClickStar) actions.observeStar(firstClickStar)
      return
    }
    if (e.detail > 2) return
    const button = (e.target as Element).closest<HTMLElement>(".entry")
    const star = button ? store.getState().stars.find((s) => s.id === button.dataset.id) : undefined
    firstClickStar = star
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
    const query = normalizeSearchText(state.searchQuery)
    const active = getActiveStars(state)
    const sorted = active
      .filter((s) => s.searchText.includes(query))
      .map((star) => ({ star, distance: observerDistance(star, state.observer) }))
      .sort((a, b) => a.distance - b.distance)
      .map(({ star }) => star)
    const first = sorted.slice(0, LIST_LIMIT)
    const selected = state.selected
    // Pin the focused star when it falls outside the first page or the search results.
    const pinned = selected !== null && active.includes(selected) && !first.includes(selected)
    const pinnedHtml = pinned
      ? `<div class="pinned-heading">${sorted.includes(selected) ? t.pinnedBeyondLimit(i18n.formatInteger(LIST_LIMIT)) : t.pinnedNotInResults}</div>${renderEntry(selected, state, i18n)}<div class="pinned-divider"></div>`
      : ""
    const entries = first.map((star) => renderEntry(star, state, i18n)).join("")
    list.innerHTML =
      pinnedHtml + entries || `<p style="font-size:12px;color:#8ba7bc">${t.noMatches}</p>`
    if (sorted.length > LIST_LIMIT) {
      list.insertAdjacentHTML(
        "beforeend",
        `<div class="small-note">${t.more(i18n.formatInteger(sorted.length - LIST_LIMIT))}</div>`,
      )
    }
    sortLabel.textContent = t.sortLabel(i18n.t.units[state.unitMode].label)
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
