import { describe, expect, it } from "vitest"
import { spectralClass } from "../../src/catalog/spectral"

describe("spectralClass", () => {
  it("takes the class letter of a full spectral type", () => {
    expect(spectralClass("A0mA1Va")).toBe("A")
    expect(spectralClass("M3.5Ve")).toBe("M")
    expect(spectralClass("k-m")).toBe("K")
    expect(spectralClass("")).toBe("")
  })

  it("treats a lowercase d prefix as dwarf, not white dwarf", () => {
    expect(spectralClass("DA2")).toBe("D")
    expect(spectralClass("dM5.5e")).toBe("M")
    expect(spectralClass("dK6")).toBe("K")
  })
})
