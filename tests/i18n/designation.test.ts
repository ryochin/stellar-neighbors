import { describe, expect, it } from "vitest"
import type { Designation } from "../../src/catalog/types"
import { CONSTELLATIONS } from "../../src/i18n/catalog/constellations"
import { formatDesignation } from "../../src/i18n/catalog/designation"
import { SUPPORTED_LOCALES } from "../../src/i18n/locales"

const designation = (overrides: Partial<Designation>): Designation => ({
  bayer: null,
  bayerIndex: null,
  flamsteed: null,
  constellation: "Cet",
  component: "",
  ...overrides,
})

describe("formatDesignation", () => {
  it("prefers the Bayer letter over the Flamsteed number", () => {
    const tauCeti = designation({ bayer: "Tau", flamsteed: 52 })
    expect(formatDesignation(tauCeti, "en")).toBe("Tau Ceti")
    expect(formatDesignation(tauCeti, "ja")).toBe("くじら座τ星")
  })

  it("adds the superscript index and the component letter", () => {
    const d = designation({ bayer: "Alp", bayerIndex: 2, constellation: "Cen", component: "B" })
    expect(formatDesignation(d, "en")).toBe("Alpha2 Centauri B")
    expect(formatDesignation(d, "ja")).toBe("ケンタウルス座α2星B")
  })

  it("uses the Flamsteed number when there is no Bayer letter", () => {
    const d = designation({ flamsteed: 61, constellation: "Cyg", component: "A" })
    expect(formatDesignation(d, "en")).toBe("61 Cygni A")
    expect(formatDesignation(d, "ja")).toBe("はくちょう座61番星A")
  })

  it("returns null for unknown letters or constellations", () => {
    expect(formatDesignation(designation({ bayer: "Xyz" }), "en")).toBeNull()
    expect(formatDesignation(designation({ flamsteed: 1, constellation: "Zzz" }), "en")).toBeNull()
    expect(formatDesignation(designation({}), "en")).toBeNull()
  })

  it("covers all 88 constellations in every locale", () => {
    expect(Object.keys(CONSTELLATIONS)).toHaveLength(88)
    for (const names of Object.values(CONSTELLATIONS)) {
      for (const locale of SUPPORTED_LOCALES) expect(names[locale]).toBeTruthy()
    }
  })
})
