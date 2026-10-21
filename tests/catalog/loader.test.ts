import { describe, expect, it } from "vitest"
import {
  loadCatalog,
  loadLocalNames,
  parseCatalog,
  parseLocalNames,
  rowToStar,
  withLocalNames,
} from "../../src/catalog/loader"
import { SUN_ROW } from "../../src/catalog/sun"
import { CATALOG_FIELDS, type CatalogRow } from "../../src/catalog/types"

const SIRIUS_ROW: CatalogRow = [
  "hyg-32263",
  "Sirius",
  "Gl 244A",
  "Alp",
  9,
  "CMa",
  "",
  8.601,
  6.752481,
  -16.716116,
  "A",
  -1.44,
  9,
]
// No proper name: the designation names it, with the superscript index split off "Pi-3".
const PI3_ORI_ROW: CatalogRow = [
  "hyg-22388",
  "",
  "Gl 178",
  "Pi-3",
  1,
  "Ori",
  "",
  26.32,
  4.830669,
  6.961275,
  "F",
  3.19,
  0,
]
const GLIESE_ROW: CatalogRow = ["hyg-1", "", "GJ 1293", "", null, "", "", 10, 1, 1, "M", 12, 0]

const validFile = () => ({
  version: 2,
  meta: {
    source: "test",
    license: "CC BY-SA 4.0",
    generatedAt: "2026-10-20",
    maxDistanceLy: 173.2,
  },
  fields: [...CATALOG_FIELDS],
  stars: [SUN_ROW, SIRIUS_ROW],
})

const namesFile = (names: Record<string, string>, locale = "ja") => ({
  version: 1,
  locale,
  names,
})

describe("rowToStar", () => {
  it("places the Sun at the origin without galactic angles", () => {
    const sun = rowToStar(SUN_ROW)
    expect(sun.eq).toEqual([0, 0, 0])
    expect(sun.l).toBeNull()
    expect(sun.color).toBe("#ffe9b3")
    expect(sun.designation).toBeNull()
  })

  it("derives galactic coordinates from RA/Dec/distance", () => {
    const sirius = rowToStar(SIRIUS_ROW)
    expect(sirius.l).toBeCloseTo(227.23, 1)
    expect(Math.hypot(...sirius.gal)).toBeCloseTo(8.601, 6)
  })

  it("names a star by proper name, else designation, else catalog ID", () => {
    expect(rowToStar(SIRIUS_ROW).name).toBe("Sirius")
    expect(rowToStar(PI3_ORI_ROW).name).toBe("Pi3 Orionis")
    expect(rowToStar(PI3_ORI_ROW).designation).toEqual({
      bayer: "Pi",
      bayerIndex: 3,
      flamsteed: 1,
      constellation: "Ori",
      component: "",
    })
    expect(rowToStar(GLIESE_ROW).name).toBe("GJ 1293")
    expect(rowToStar(GLIESE_ROW).localName).toBeNull()
  })
})

describe("parseCatalog", () => {
  it("returns meta and stars", () => {
    const catalog = parseCatalog(validFile())
    expect(catalog.stars.map((s) => s.name)).toEqual(["Sun", "Sirius"])
    expect(catalog.meta.source).toBe("test")
  })

  it("rejects an unknown version", () => {
    expect(() => parseCatalog({ ...validFile(), version: 1 })).toThrow(/version/)
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

describe("local names", () => {
  it("rejects a file for another locale or version", () => {
    expect(() => parseLocalNames(namesFile({}, "fr"), "ja")).toThrow(/locale/)
    expect(() => parseLocalNames({ ...namesFile({}), version: 9 }, "ja")).toThrow(/version/)
  })

  it("rejects empty or non-string names", () => {
    expect(() => parseLocalNames(namesFile({ "hyg-0": "" }), "ja")).toThrow(/invalid/)
    expect(() => parseLocalNames({ ...namesFile({}), names: ["太陽"] }, "ja")).toThrow(/invalid/)
  })

  it("loads a names file", async () => {
    const fakeFetch = async () => new Response(JSON.stringify(namesFile({ "hyg-0": "太陽" })))
    const names = await loadLocalNames("/names.ja.json", "ja", fakeFetch)
    expect(names.get("hyg-0")).toBe("太陽")
  })

  it("prefers the table, falls back to the designation and leaves the rest without", () => {
    const stars = [SUN_ROW, SIRIUS_ROW, PI3_ORI_ROW, GLIESE_ROW].map(rowToStar)
    const names = new Map([
      ["hyg-0", "太陽"],
      ["hyg-32263", "シリウス"],
    ])
    expect(withLocalNames(stars, names, "ja").map((s) => s.localName)).toEqual([
      "太陽",
      "シリウス",
      "オリオン座π3星",
      null,
    ])
  })

  it("adds the local name to the search text", () => {
    const [sirius] = withLocalNames(
      [rowToStar(SIRIUS_ROW)],
      new Map([["hyg-32263", "シリウス"]]),
      "ja",
    )
    expect(sirius.searchText).toContain("シリウス")
    expect(sirius.searchText).toContain("gl 244a")
  })
})
