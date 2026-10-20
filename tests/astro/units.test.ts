import { describe, expect, it } from "vitest"
import { formatAxisValue, formatDistance, nextUnitMode } from "../../src/astro/units"

describe("units", () => {
  it("formats distances with unit-dependent precision", () => {
    expect(formatDistance(8.6, "ly")).toBe("8.60 ly")
    expect(formatDistance(100, "ly")).toBe("100 ly")
    expect(formatDistance(100, "pc")).toBe("30.7 pc")
    expect(formatDistance(100, "mau")).toBe("6.32 MAU")
    expect(formatDistance(0, "mau")).toBe("0 MAU")
  })

  it("formats axis tick values compactly", () => {
    expect(formatAxisValue(-25, "ly")).toBe("-25")
    expect(formatAxisValue(0, "ly")).toBe("0")
    expect(formatAxisValue(25, "pc")).toBe("7.7")
    expect(formatAxisValue(50, "mau")).toBe("3.16")
  })

  it("cycles ly -> pc -> mau -> ly", () => {
    expect(nextUnitMode("ly")).toBe("pc")
    expect(nextUnitMode("pc")).toBe("mau")
    expect(nextUnitMode("mau")).toBe("ly")
  })
})
