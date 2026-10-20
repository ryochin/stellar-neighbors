import { describe, expect, it, vi } from "vitest"
import { createStore } from "../../src/state/store"

describe("createStore", () => {
  it("merges patches and notifies with the previous state", () => {
    const store = createStore({ a: 1, b: "x" })
    const listener = vi.fn()
    store.subscribe(listener)
    store.setState({ a: 2 })
    expect(store.getState()).toEqual({ a: 2, b: "x" })
    expect(listener).toHaveBeenCalledWith({ a: 2, b: "x" }, { a: 1, b: "x" })
  })

  it("accepts updater functions", () => {
    const store = createStore({ count: 1 })
    store.setState((s) => ({ count: s.count + 1 }))
    expect(store.getState().count).toBe(2)
  })

  it("stops notifying after unsubscribe", () => {
    const store = createStore({ a: 1 })
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    unsubscribe()
    store.setState({ a: 2 })
    expect(listener).not.toHaveBeenCalled()
  })
})
