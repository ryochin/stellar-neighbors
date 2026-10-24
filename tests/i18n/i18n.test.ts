import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { I18N_ATTRIBUTES } from "../../src/i18n/document"
import { MESSAGES, createI18n } from "../../src/i18n/i18n"
import { SUPPORTED_LOCALES } from "../../src/i18n/locales"
import { en } from "../../src/i18n/messages/en"

// Dotted paths of every leaf, so a locale cannot miss or add a message even through a cast.
function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe("messages", () => {
  it.each(SUPPORTED_LOCALES)("%s has the same keys as en", (locale) => {
    expect(leafPaths(MESSAGES[locale]).sort()).toEqual(leafPaths(en).sort())
  })

  it("covers exactly the data-i18n keys of index.html", () => {
    const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8")
    const pattern = new RegExp(`(?:${I18N_ATTRIBUTES.join("|")})="([^"]+)"`, "g")
    const used = new Set([...html.matchAll(pattern)].map((match) => match[1]))
    // The title is applied through document.title rather than an attribute.
    used.add("title")
    expect([...used].sort()).toEqual(Object.keys(en.page).sort())
  })
})

describe("createI18n", () => {
  it("formats distances in English", () => {
    const { formatDistance } = createI18n("en")
    expect(formatDistance(8.6, "ly")).toBe("8.60 ly")
    expect(formatDistance(100, "ly")).toBe("100 ly")
    expect(formatDistance(100, "pc")).toBe("30.7 pc")
    expect(formatDistance(100, "mau")).toBe("6.32 MAU")
    expect(formatDistance(0, "mau")).toBe("0 MAU")
  })

  it("formats distances in Japanese", () => {
    const { formatDistance, distanceParts } = createI18n("ja")
    expect(formatDistance(8.6, "ly")).toBe("8.60 光年")
    expect(formatDistance(100, "pc")).toBe("30.7 パーセク")
    expect(distanceParts(100, "mau")).toEqual({ value: "6.32", unit: "百万天文単位" })
  })

  it("groups integers by the locale", () => {
    expect(createI18n("en").formatInteger(9596)).toBe("9,596")
    expect(createI18n("ja").formatInteger(9596)).toBe("9,596")
  })
})
