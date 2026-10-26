import { beforeEach, describe, expect, it } from "vitest"
import {
  createActions,
  createInitialState,
  getActiveStars,
  type AppActions,
  type AppState,
} from "../../src/state/app-state"
import { createStore, type Store } from "../../src/state/store"
import type { CatalogMeta } from "../../src/catalog/types"
import { makeStarFromGal } from "../helpers"

const META: CatalogMeta = {
  source: "test",
  license: "",
  generatedAt: "",
  maxDistanceLy: 173.2,
}
const sun = makeStarFromGal("sun", [0, 0, 0], { name: "Sun", localName: "太陽" })
const near = makeStarFromGal("near", [10, 0, 0])
const mid = makeStarFromGal("mid", [40, 0, 0], { name: "Mid", localName: "ミッド" })
const far = makeStarFromGal("far", [90, 0, 0])

let store: Store<AppState>
let actions: AppActions

beforeEach(() => {
  store = createStore(createInitialState())
  actions = createActions(store)
  actions.catalogLoaded([sun, near, mid, far], META)
})

describe("app actions", () => {
  it("starts at the Sun once the catalog is loaded", () => {
    const state = store.getState()
    expect(state.observer).toBe(sun)
    expect(state.selected).toBe(sun)
    expect(state.loadStatus.kind).toBe("ready")
  })

  it("ignores observers beyond the allowed distance", () => {
    actions.setObserver(far)
    expect(store.getState().observer).toBe(sun)
  })

  it("resets the radius when the observer changes", () => {
    actions.setMaxRadius(20)
    actions.setObserver(mid)
    expect(store.getState().observer).toBe(mid)
    expect(store.getState().maxRadius).toBe(87)
  })

  it("falls back to the observer when the selection leaves the visible set", () => {
    actions.selectStar(near)
    actions.setMaxRadius(5)
    expect(store.getState().selected).toBe(sun)
  })

  it("observes a star by English or local name and returns to the Sun", () => {
    actions.observeNamed("Mid")
    expect(store.getState().observer).toBe(mid)
    expect(store.getState().selected).toBe(mid)
    actions.returnToSun()
    expect(store.getState().observer).toBe(sun)
    actions.observeNamed("ミッド")
    expect(store.getState().observer).toBe(mid)
  })

  it("starts with the celestial equator hidden and toggles it", () => {
    expect(store.getState().showCelestialEquator).toBe(false)
    actions.toggleCelestialEquator()
    expect(store.getState().showCelestialEquator).toBe(true)
    actions.toggleCelestialEquator()
    expect(store.getState().showCelestialEquator).toBe(false)
  })

  it("has no Wikipedia articles until the links file loads", () => {
    expect(store.getState().wikipediaArticles).toBeNull()
    const articles = new Map([["sun", ["en", "Sun"] as const]])
    actions.wikipediaLoaded(articles)
    expect(store.getState().wikipediaArticles).toBe(articles)
  })

  it("memoizes the active set for identical inputs", () => {
    const state = store.getState()
    expect(getActiveStars(state)).toBe(getActiveStars({ ...state, searchQuery: "x" }))
  })
})
