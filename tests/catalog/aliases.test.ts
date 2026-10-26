import { describe, expect, it } from "vitest"
import { catalogIdList, otherDesignations, primaryCatalogId } from "../../src/catalog/aliases"
import type { Designation } from "../../src/catalog/types"
import { makeStar } from "../helpers"

const SIRIUS_IDS = { gl: "Gl 244A", hip: 32349, hd: 48915, hr: 2491 }
const SIRIUS_DESIGNATION: Designation = {
  bayer: "Alp",
  bayerIndex: null,
  flamsteed: 9,
  variable: null,
  constellation: "CMa",
  component: "",
}

describe("catalog IDs", () => {
  it("lists Gliese, HIP, HD and HR in that order", () => {
    expect(catalogIdList(SIRIUS_IDS)).toEqual(["Gl 244A", "HIP 32349", "HD 48915", "HR 2491"])
    expect(catalogIdList({ gl: "", hip: null, hd: 1, hr: null })).toEqual(["HD 1"])
  })

  it("picks Gliese, else HIP, else HD, never HR", () => {
    expect(primaryCatalogId(SIRIUS_IDS)).toBe("Gl 244A")
    expect(primaryCatalogId({ ...SIRIUS_IDS, gl: "" })).toBe("HIP 32349")
    expect(primaryCatalogId({ gl: "", hip: null, hd: null, hr: 5 })).toBe("")
  })
})

describe("otherDesignations", () => {
  const sirius = makeStar("hyg-32263", [1, 0, 0], {
    name: "Sirius",
    designation: SIRIUS_DESIGNATION,
  })

  it("lists the Bayer and Flamsteed designations of a star with a proper name", () => {
    expect(otherDesignations(sirius, "en")).toEqual(["Alpha Canis Majoris", "9 Canis Majoris"])
    expect(otherDesignations({ ...sirius, localName: "シリウス" }, "ja")).toEqual([
      "おおいぬ座α星",
      "おおいぬ座9番星",
    ])
  })

  it("leaves out the designation already shown as the name", () => {
    const tauCeti = makeStar("hyg-8087", [1, 0, 0], {
      name: "Tau Ceti",
      localName: "くじら座τ星",
      designation: { ...SIRIUS_DESIGNATION, bayer: "Tau", flamsteed: 52, constellation: "Cet" },
    })
    expect(otherDesignations(tauCeti, "en")).toEqual(["52 Ceti"])
    expect(otherDesignations(tauCeti, "ja")).toEqual(["くじら座52番星"])
  })

  it("adds the variable star name", () => {
    const proxima = makeStar("hyg-70666", [1, 0, 0], {
      name: "Proxima Centauri",
      designation: {
        bayer: null,
        bayerIndex: null,
        flamsteed: null,
        variable: "V645",
        constellation: "Cen",
        component: "",
      },
    })
    expect(otherDesignations(proxima, "en")).toEqual(["V645 Centauri"])
    expect(otherDesignations(proxima, "ja")).toEqual(["ケンタウルス座V645星"])
  })

  it("returns nothing for a star without a designation", () => {
    expect(otherDesignations(makeStar("hyg-1", [1, 0, 0]), "en")).toEqual([])
  })
})
