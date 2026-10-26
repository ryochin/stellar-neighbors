import { describe, expect, it } from "vitest"
import {
  buildArticles,
  glieseKey,
  hipKey,
  indexSitelinks,
  localeArticles,
  parseSitelinkRows,
  serializeWikipediaLinks,
  createWikipediaLinksFile,
  type ArticleSources,
  type SitelinkRow,
  type StarIds,
} from "../../scripts/wikipedia-builder"

const star = (id: string, hip: number | null, gl = ""): StarIds => ({
  id,
  catalogIds: { gl, hip, hd: null, hr: null },
})
const row = (code: string, via: SitelinkRow["via"], wiki: string, title: string): SitelinkRow => ({
  code,
  via,
  wiki,
  title,
})

function sources(hipRows: SitelinkRow[], glieseRows: SitelinkRow[] = []): ArticleSources {
  return {
    hip: indexSitelinks(hipRows, hipKey),
    gliese: indexSitelinks(glieseRows, glieseKey),
    items: indexSitelinks([row("Q525", "self", "en", "Sun")], (code) => code),
    starItems: { "hyg-0": "Q525" },
  }
}

describe("catalog keys", () => {
  it("reads HIP numbers and skips planets", () => {
    expect(hipKey("HIP 32349")).toBe("32349")
    expect(hipKey("HIP  48106")).toBe("48106")
    expect(hipKey("HIP 41378 f")).toBeNull()
  })

  it("matches our Gliese labels to Wikidata's spelling", () => {
    expect(glieseKey("Gl 244A")).toBe(glieseKey("GJ 244 A"))
    expect(glieseKey("GJ 1061")).toBe("1061")
    expect(glieseKey("Gl 105.5")).toBe("105.5")
    expect(glieseKey("GJ 876 b")).toBeNull()
  })
})

describe("parseSitelinkRows", () => {
  it("keeps Wikipedia rows and drops other sites", () => {
    const binding = (site: string) => ({
      code: { value: "HIP 1" },
      via: { value: "self" },
      site: { value: site },
      title: { value: "T" },
    })
    const json = {
      results: {
        bindings: [binding("https://ja.wikipedia.org/"), binding("https://en.wikivoyage.org/")],
      },
    }
    expect(parseSitelinkRows(json)).toEqual([row("HIP 1", "self", "ja", "T")])
  })

  it("rejects a result without bindings", () => {
    expect(() => parseSitelinkRows({})).toThrow("Unexpected SPARQL result")
  })
})

describe("buildArticles", () => {
  const wikis = ["en", "ja"]

  it("prefers the star's own article to its system's", () => {
    const { articles } = buildArticles(
      [star("a", 1), star("b", 2)],
      sources([
        row("HIP 1", "self", "en", "Sirius A"),
        row("HIP 1", "parent", "en", "Sirius"),
        row("HIP 2", "parent", "en", "Castor (star)"),
      ]),
      wikis,
    )
    expect(articles.get("a")?.get("en")).toBe("Sirius A")
    expect(articles.get("b")?.get("en")).toBe("Castor (star)")
  })

  it("falls back to Gliese per wiki and uses the item table for the Sun", () => {
    const { articles } = buildArticles(
      [star("hyg-0", null), star("c", 3, "Gl 559B")],
      sources(
        [row("HIP 3", "self", "en", "Toliman")],
        [row("GJ 559 B", "self", "ja", "ケンタウルス座アルファ星")],
      ),
      wikis,
    )
    expect(articles.get("hyg-0")?.get("en")).toBe("Sun")
    expect(Object.fromEntries(articles.get("c") ?? [])).toEqual({
      en: "Toliman",
      ja: "ケンタウルス座アルファ星",
    })
  })

  it("leaves out stars without an article and logs ties", () => {
    const { articles, ambiguities } = buildArticles(
      [star("d", 4), star("e", 5)],
      sources([row("HIP 4", "parent", "en", "Z system"), row("HIP 4", "parent", "en", "A system")]),
      wikis,
    )
    expect(articles.get("d")?.get("en")).toBe("A system")
    expect(articles.has("e")).toBe(false)
    expect(ambiguities).toEqual([{ starId: "d", wiki: "en", titles: ["A system", "Z system"] }])
  })
})

describe("localeArticles", () => {
  const articles = new Map([
    [
      "a",
      new Map([
        ["en", "Sirius"],
        ["ja", "シリウス"],
      ]),
    ],
    ["b", new Map([["en", "HD 1"]])],
    ["c", new Map([["ja", "日本語だけ"]])],
  ])

  it("uses the locale's own wiki, else English", () => {
    expect(localeArticles(articles, "ja")).toEqual({
      a: ["ja", "シリウス"],
      b: ["en", "HD 1"],
      c: ["ja", "日本語だけ"],
    })
    expect(localeArticles(articles, "en")).toEqual({ a: ["en", "Sirius"], b: ["en", "HD 1"] })
  })
})

describe("serializeWikipediaLinks", () => {
  it("round-trips one article per line", () => {
    const file = createWikipediaLinksFile(
      "ja",
      { a: ["ja", "シリウス"], b: ["en", "Barnard's Star"] },
      { source: "Wikidata (CC0)", generatedAt: "2026-10-26" },
    )
    const text = serializeWikipediaLinks(file)
    expect(JSON.parse(text)).toEqual(file)
    expect(text).toContain('    "b": ["en", "Barnard\'s Star"]\n')
  })
})
