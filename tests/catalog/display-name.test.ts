import { describe, expect, it } from "vitest"
import { displayName, secondaryName } from "../../src/catalog/display-name"
import { makeStar } from "../helpers"

describe("display names", () => {
  it("shows the English name alone in English", () => {
    const star = makeStar("s", [1, 0, 0], { name: "Sirius", localName: null })
    expect(displayName(star)).toBe("Sirius")
    expect(secondaryName(star)).toBeNull()
  })

  it("shows the local name first and the English name second", () => {
    const star = makeStar("s", [1, 0, 0], { name: "Sirius", localName: "シリウス" })
    expect(displayName(star)).toBe("シリウス")
    expect(secondaryName(star)).toBe("Sirius")
  })

  it("drops the second name when both are the same", () => {
    const star = makeStar("s", [1, 0, 0], { name: "GJ 1002", localName: "GJ 1002" })
    expect(secondaryName(star)).toBeNull()
  })
})
