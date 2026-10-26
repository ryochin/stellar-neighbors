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
  32349,
  48915,
  2491,
  "Alp",
  9,
  "",
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
  22449,
  30652,
  1543,
  "Pi-3",
  1,
  "",
  "Ori",
  "",
  26.32,
  4.830669,
  6.961275,
  "F",
  3.19,
  0,
]
// prettier-ignore
const GLIESE_ROW: CatalogRow = ["hyg-1", "", "GJ 1293", null, null, null, "", null, "", "", "", 10, 1, 1, "M", 12, 0]
// A variable star name only: it does not name the star, the catalog ID does.
// prettier-ignore
const PROXIMA_ROW: CatalogRow = ["hyg-70666", "", "Gl 551", 70890, null, null, "", null, "V645", "Cen", "", 4.227, 14.495985, -62.67948, "M", 11.01, 5]
// prettier-ignore
const HIP_ONLY_ROW: CatalogRow = ["hyg-2", "", "", 2, 224690, null, "", null, "", "", "", 156.43, 0.000283, -19.49884, "K", 9.27, 0]

const validFile = () => ({
  version: 3,
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
      variable: null,
      constellation: "Ori",
      component: "",
    })
    expect(rowToStar(GLIESE_ROW).name).toBe("GJ 1293")
    expect(rowToStar(GLIESE_ROW).localName).toBeNull()
    expect(rowToStar(PROXIMA_ROW).name).toBe("Gl 551")
  })

  it("picks the catalog label from Gliese, then HIP, then HD", () => {
    expect(rowToStar(SIRIUS_ROW).catalogLabel).toBe("Gl 244A")
    expect(rowToStar(HIP_ONLY_ROW).catalogLabel).toBe("HIP 2")
    expect(rowToStar(SUN_ROW).catalogLabel).toBe("")
  })

  it("keeps every catalog ID and the variable star name", () => {
    expect(rowToStar(SIRIUS_ROW).catalogIds).toEqual({
      gl: "Gl 244A",
      hip: 32349,
      hd: 48915,
      hr: 2491,
    })
    expect(rowToStar(PROXIMA_ROW).designation?.variable).toBe("V645")
  })

  it("finds a star by its designations, catalog IDs and abbreviated forms", () => {
    const { searchText } = rowToStar(SIRIUS_ROW)
    for (const term of ["alpha canis majoris", "9 canis majoris", "hd 48915", "hr 2491"]) {
      expect(searchText).toContain(term)
    }
    for (const term of ["alpha cma", "α cma", "alp cma", "9 cma"])
      expect(searchText).toContain(term)
    expect(rowToStar(PROXIMA_ROW).searchText).toContain("v645 cen")
    // Without the superscript index too, so "Pi Orionis" finds Pi3 Orionis.
    for (const term of ["pi3 orionis", "pi orionis", "π ori"]) {
      expect(rowToStar(PI3_ORI_ROW).searchText).toContain(term)
    }
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
    expect(sirius.searchText).toContain("おおいぬ座α星")
    expect(sirius.searchText).toContain("おおいぬ座9番星")
    expect(sirius.searchText).toContain("alpha canis majoris")
  })
})
