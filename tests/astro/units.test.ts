import { describe, expect, it } from "vitest"
import { convertDistance, formatAxisValue, nextUnitMode } from "../../src/astro/units"

describe("units", () => {
  it("converts distances with unit-dependent precision", () => {
    expect(convertDistance(8.6, "ly")).toEqual({ value: 8.6, digits: 2 })
    expect(convertDistance(100, "ly")).toEqual({ value: 100, digits: 0 })
    expect(convertDistance(100, "pc").digits).toBe(1)
    expect(convertDistance(100, "mau").digits).toBe(2)
    expect(convertDistance(0, "mau")).toEqual({ value: 0, digits: 0 })
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
