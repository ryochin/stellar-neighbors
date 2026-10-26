import { describe, expect, it } from "vitest"
import { formatDeclination, formatRightAscension } from "../../src/astro/sexagesimal"

describe("sexagesimal", () => {
  it("formats Sirius as star charts do", () => {
    expect(formatRightAscension(6.752477)).toBe("6h 45m 09s")
    expect(formatDeclination(-16.716116)).toBe("-16° 42′ 58″")
  })

  it("carries rounded seconds into minutes and wraps 24h to 0h", () => {
    expect(formatRightAscension(1 + 59.6 / 3600)).toBe("1h 01m 00s")
    expect(formatRightAscension(23.99999)).toBe("0h 00m 00s")
    expect(formatDeclination(5 + 59 / 60 + 59.6 / 3600)).toBe("+6° 00′ 00″")
  })

  it("keeps the sign of small southern declinations", () => {
    expect(formatDeclination(-0.5)).toBe("-0° 30′ 00″")
    expect(formatDeclination(0)).toBe("+0° 00′ 00″")
    expect(formatDeclination(89.26411)).toBe("+89° 15′ 51″")
  })
})
