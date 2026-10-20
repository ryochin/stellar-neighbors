export type Listener<T> = (state: T, previous: T) => void

export interface Store<T> {
  getState(): T
  setState(patch: Partial<T> | ((state: T) => Partial<T>)): void
  subscribe(listener: Listener<T>): () => void
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<Listener<T>>()
  return {
    getState: () => state,
    setState(patch) {
      const previous = state
      const next = typeof patch === "function" ? patch(state) : patch
      state = { ...state, ...next }
      listeners.forEach((listener) => listener(state, previous))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
