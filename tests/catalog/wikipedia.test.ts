import { describe, expect, it } from "vitest"
import { loadWikipediaLinks, parseWikipediaLinks, wikipediaUrl } from "../../src/catalog/wikipedia"

const file = (overrides: object = {}) => ({
  version: 1,
  locale: "ja",
  source: "Wikidata (CC0)",
  generatedAt: "2026-10-26",
  articles: { "hyg-32263": ["ja", "シリウス"] },
  ...overrides,
})

describe("parseWikipediaLinks", () => {
  it("reads the articles of its locale", () => {
    expect(parseWikipediaLinks(file(), "ja").get("hyg-32263")).toEqual(["ja", "シリウス"])
  })

  it("accepts English fallbacks", () => {
    const fallback = file({ articles: { a: ["en", "HD 1"] } })
    expect(parseWikipediaLinks(fallback, "ja").get("a")).toEqual(["en", "HD 1"])
  })

  it("rejects another version or locale", () => {
    expect(() => parseWikipediaLinks(file({ version: 2 }), "ja")).toThrow("Unsupported")
    expect(() => parseWikipediaLinks(file(), "en")).toThrow("Unsupported")
  })

  it("rejects malformed articles", () => {
    for (const articles of [
      null,
      [["ja", "シリウス"]],
      { a: "Sirius" },
      { a: ["en"] },
      { a: ["en", ""] },
      { a: ["de", "Sirius"] },
      { a: ["evil.example/", "x"] },
    ]) {
      expect(() => parseWikipediaLinks(file({ articles }), "ja")).toThrow("invalid articles")
    }
  })

  it("loads through fetch and reports HTTP errors", async () => {
    const ok = async () => new Response(JSON.stringify(file()))
    expect((await loadWikipediaLinks("/w.json", "ja", ok)).size).toBe(1)
    const missing = async () => new Response("", { status: 404 })
    await expect(loadWikipediaLinks("/w.json", "ja", missing)).rejects.toThrow("HTTP 404")
  })
})

describe("wikipediaUrl", () => {
  it("writes spaces as underscores and percent-encodes the rest", () => {
    expect(wikipediaUrl(["en", "Barnard's Star"])).toBe(
      "https://en.wikipedia.org/wiki/Barnard's_Star",
    )
    expect(wikipediaUrl(["en", "Castor (star)"])).toBe(
      "https://en.wikipedia.org/wiki/Castor_(star)",
    )
    expect(wikipediaUrl(["ja", "シリウス"])).toBe(
      "https://ja.wikipedia.org/wiki/%E3%82%B7%E3%83%AA%E3%82%A6%E3%82%B9",
    )
    expect(wikipediaUrl(["en", "AC/DC?"])).toBe("https://en.wikipedia.org/wiki/AC%2FDC%3F")
  })
})
