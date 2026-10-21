import { hasChanged, type AppActions, type AppState } from "../state/app-state"
import type { Store } from "../state/store"
import { byId } from "./dom"

export function mountObserverBox(store: Store<AppState>, actions: AppActions): void {
  const name = byId("observerName")
  const returnSun = byId<HTMLButtonElement>("returnSun")
  returnSun.addEventListener("click", () => actions.returnToSun())
  byId("observeSirius").addEventListener("click", () => actions.observeNamed("Sirius"))
  byId("observeProxima").addEventListener("click", () => actions.observeNamed("Proxima Centauri"))

  const render = (state: AppState): void => {
    name.textContent = state.observer.name
    returnSun.disabled = state.observer.distLy === 0
  }
  render(store.getState())
  store.subscribe((state, previous) => {
    if (hasChanged(state, previous, ["observer"])) render(state)
  })
}
