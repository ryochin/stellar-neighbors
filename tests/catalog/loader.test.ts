import { describe, expect, it } from "vitest"
import { loadCatalog, parseCatalog, rowToStar } from "../../src/catalog/loader"
import { SUN_ROW } from "../../src/catalog/sun"
import { CATALOG_FIELDS, type CatalogRow } from "../../src/catalog/types"

const SIRIUS_ROW: CatalogRow = [
  "hyg-32263",
  "Sirius",
  "シリウス",
  "Gl 244A",
  8.601,
  6.752481,
  -16.716116,
  "A",
  -1.44,
  9,
]

const validFile = () => ({
  version: 1,
  meta: {
    source: "test",
    license: "CC BY-SA 4.0",
    generatedAt: "2026-10-20",
    maxDistanceLy: 173.2,
  },
  fields: [...CATALOG_FIELDS],
  stars: [SUN_ROW, SIRIUS_ROW],
})

describe("rowToStar", () => {
  it("places the Sun at the origin without galactic angles", () => {
    const sun = rowToStar(SUN_ROW)
    expect(sun.eq).toEqual([0, 0, 0])
    expect(sun.l).toBeNull()
    expect(sun.color).toBe("#ffe9b3")
  })

  it("derives galactic coordinates from RA/Dec/distance", () => {
    const sirius = rowToStar(SIRIUS_ROW)
    expect(sirius.l).toBeCloseTo(227.23, 1)
    expect(Math.hypot(...sirius.gal)).toBeCloseTo(8.601, 6)
  })
})

describe("parseCatalog", () => {
  it("returns meta and stars", () => {
    const catalog = parseCatalog(validFile())
    expect(catalog.stars.map((s) => s.name)).toEqual(["Sun", "Sirius"])
    expect(catalog.meta.source).toBe("test")
  })

  it("rejects an unknown version", () => {
    expect(() => parseCatalog({ ...validFile(), version: 2 })).toThrow(/version/)
  })

  it("rejects unexpected fields", () => {
    expect(() => parseCatalog({ ...validFile(), fields: ["id"] })).toThrow(/fields/)
  })
})

describe("loadCatalog", () => {
  it("reports HTTP errors", async () => {
    const fakeFetch = async () => new Response("", { status: 404 })
    await expect(loadCatalog("/stars.json", fakeFetch)).rejects.toThrow(/HTTP 404/)
  })

  it("parses a successful response", async () => {
    const fakeFetch = async () => new Response(JSON.stringify(validFile()))
    const catalog = await loadCatalog("/stars.json", fakeFetch)
    expect(catalog.stars).toHaveLength(2)
  })
})
