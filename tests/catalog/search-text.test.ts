import { describe, expect, it } from "vitest"
import { normalizeSearchText } from "../../src/catalog/search-text"

describe("normalizeSearchText", () => {
  it("folds case, diacritics and full-width characters", () => {
    expect(normalizeSearchText("  Tau Boötis ")).toBe("tau bootis")
    expect(normalizeSearchText("ＳＩＲＩＵＳ")).toBe("sirius")
  })

  it("matches Japanese text with the same folding on both sides", () => {
    expect(normalizeSearchText("ガンマ・レポリス")).toContain(normalizeSearchText("ガンマ"))
  })
})
