import { describe, expect, it } from "vitest"
import { detectLocale, resolveLocale } from "../../src/i18n/locales"

describe("detectLocale", () => {
  it("matches the primary subtag of the first supported language", () => {
    expect(detectLocale(["ja-JP", "en-US"])).toBe("ja")
    expect(detectLocale(["fr-FR", "JA", "en"])).toBe("ja")
    expect(detectLocale(["en-GB", "ja"])).toBe("en")
  })

  it("falls back to English", () => {
    expect(detectLocale(["fr", "de-DE"])).toBe("en")
    expect(detectLocale([])).toBe("en")
  })
})

describe("resolveLocale", () => {
  it("lets ?lang= override the browser languages", () => {
    expect(resolveLocale("?lang=ja", ["en-US"])).toBe("ja")
    expect(resolveLocale("?foo=1&lang=en", ["ja-JP"])).toBe("en")
  })

  it("ignores an unsupported or empty ?lang=", () => {
    expect(resolveLocale("?lang=fr", ["ja-JP"])).toBe("ja")
    expect(resolveLocale("?lang=", ["ja-JP"])).toBe("ja")
    expect(resolveLocale("", ["ja-JP"])).toBe("ja")
  })
})
