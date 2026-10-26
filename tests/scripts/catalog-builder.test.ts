import { describe, expect, it } from "vitest"
import {
  buildCatalogRows,
  buildLocalNames,
  createCatalogFile,
  parseCsvLine,
  parseHygCsv,
  serializeCatalog,
  type CuratedStar,
} from "../../scripts/catalog-builder"

// Sirius carries a Greek var value to check that it is dropped, as HYG does for Algol.
const CSV = [
  '"id","hip","hd","hr","gl","bf","proper","ra","dec","dist","mag","spect","bayer","flam","con","var"',
  '0,,,,"","",Sol,0.0,0.0,0.0,-26.7,G2V,,,,',
  '32263,32349,48915,2491,"Gl 244A","9Alp CMa",Sirius,6.752481,-16.716116,2.6371,-1.44,A0m,Alp,9,CMa,Alp',
  '70666,70890,,,"Gl 551","",Proxima Centauri,14.495985,-62.679485,1.3012,11.01,M5Ve,,,Cen,V645',
  '99,,,,"","","",1.0,10.0,60.0,9.0,K2,,,,',
  '100,,,,"","","",2.0,20.0,100000,9.0,M0,,,,',
  '101,500,,,"","","",3.0,bad,10,9.0,M0,,,,',
  '102,,,,"","","",4.0,5.0,20.0,,DA2,,,Tau,',
].join("\n")

const curated = (overrides: Partial<CuratedStar> & Pick<CuratedStar, "name">): CuratedStar => ({
  distLy: 0,
  raH: 0,
  decDeg: 0,
  spec: "G",
  priority: 1,
  ...overrides,
})

const CURATED: CuratedStar[] = [
  curated({ name: "Sun", priority: 9, hyg: "0" }),
  curated({
    name: "Sirius",
    distLy: 8.6,
    priority: 9,
    hip: "32349",
  }),
  curated({
    name: "Proxima Centauri",
    distLy: 4.24,
    raH: 14.495985,
    decDeg: -62.679485,
    priority: 5,
  }),
  curated({
    name: "Imaginary",
    distLy: 30,
    raH: 10,
    decDeg: 10,
    spec: "K",
  }),
]

describe("parseCsvLine", () => {
  it("handles quoted commas and escaped quotes", () => {
    expect(parseCsvLine('a,"b,c","d""e",')).toEqual(["a", "b,c", 'd"e', ""])
  })
})

describe("parseHygCsv", () => {
  it("keeps Sol and in-range stars only", () => {
    const records = parseHygCsv(CSV)
    expect(records.map((r) => r.id)).toEqual(["0", "32263", "70666", "102"])
    expect(records[0]?.distLy).toBe(0)
    expect(records[3]?.mag).toBeNull()
  })

  it("strips a BOM and accepts CRLF line endings", () => {
    const records = parseHygCsv(`\uFEFF${CSV.replaceAll("\n", "\r\n")}`)
    expect(records.map((r) => r.id)).toEqual(["0", "32263", "70666", "102"])
  })

  it("drops empty coordinates and negative distances, even for Sol", () => {
    const csv = [
      '"id","ra","dec","dist"',
      "0,0,0,-1",
      "1,,10,5",
      "2,10,,5",
      "3,10,10,-5",
      "4,10,10,5",
    ].join("\n")
    expect(parseHygCsv(csv).map((r) => r.id)).toEqual(["4"])
  })

  it("rejects CSV without required columns", () => {
    expect(() => parseHygCsv('"id","ra","dec"\n1,0,0')).toThrow(/dist/)
  })
})

describe("buildCatalogRows", () => {
  it("treats a lowercase d prefix as dwarf, not white dwarf", () => {
    const csv = [
      '"id","ra","dec","dist","spect"',
      "1,1,1,5,DA2",
      "2,2,2,5,dM5.5e",
      "3,3,3,5,dM6  e",
      "4,4,4,5,dK6",
    ].join("\n")
    const { rows } = buildCatalogRows(parseHygCsv(csv), [])
    expect(rows.map((row) => row[14])).toEqual(["D", "M", "M", "K"])
  })

  it("fuzzy-matches across the 0h/24h RA boundary", () => {
    const csv = ['"id","ra","dec","dist"', "1,23.99,10,3"].join("\n")
    const star = curated({ name: "Wrapped", distLy: 9.8, raH: 0.005, decDeg: 10 })
    const { logs } = buildCatalogRows(parseHygCsv(csv), [star])
    expect(logs[0]).toMatchObject({ method: "fuzzy", hygId: "1" })
  })

  it("merges curated names by explicit id, HIP and fuzzy match", () => {
    const { rows, logs } = buildCatalogRows(parseHygCsv(CSV), CURATED)
    // prettier-ignore
    expect(rows[0]).toEqual(["hyg-0", "Sun", "", null, null, null, "", null, "", "", "", 0, 0, 0, "G", -26.7, 9])
    expect(rows[1]).toEqual([
      "hyg-32263",
      "Sirius",
      "Gl 244A",
      32349,
      48915,
      2491,
      "Alp",
      9,
      "",
      "CMa",
      "",
      8.601,
      6.752481,
      -16.71612,
      "A",
      -1.44,
      9,
    ])
    // A variable star name keeps its constellation.
    expect(rows[2]?.slice(6, 10)).toEqual(["", null, "V645", "Cen"])
    // A constellation alone is no designation.
    expect(rows[3]?.slice(0, 10)).toEqual(["hyg-102", "", "", null, null, null, "", null, "", ""])
    expect(rows[3]?.[14]).toBe("D")
    // prettier-ignore
    expect(rows[4]?.slice(0, 11)).toEqual(["curated-3", "Imaginary", "", null, null, null, "", null, "", "", ""])
    expect(logs.map((log) => log.method)).toEqual(["hyg", "hip", "fuzzy", "none"])
  })

  it("fails when an explicit HIP is missing", () => {
    const bad = [curated({ name: "Ghost", distLy: 5, hip: "999999" })]
    expect(() => buildCatalogRows(parseHygCsv(CSV), bad)).toThrow(/999999/)
  })

  it("fails when an explicit match has an implausible distance", () => {
    const bad = [curated({ name: "Sirius", distLy: 30, hip: "32349" })]
    expect(() => buildCatalogRows(parseHygCsv(CSV), bad)).toThrow(/distance/)
  })

  it("uses the curated distance when HYG's is flagged as wrong", () => {
    const fixed = [
      curated({
        name: "Sirius",
        distLy: 30,
        hip: "32349",
        trustCuratedDistance: true,
      }),
    ]
    const { rows } = buildCatalogRows(parseHygCsv(CSV), fixed)
    expect(rows[1]?.slice(0, 3)).toEqual(["hyg-32263", "Sirius", "Gl 244A"])
    expect(rows[1]?.[11]).toBe(30)
  })

  it("fails when two curated stars claim the same HYG record", () => {
    const dup = [
      curated({ name: "Sirius", distLy: 8.6, hip: "32349" }),
      curated({ name: "Sirius again", distLy: 8.6, hip: "32349" }),
    ]
    expect(() => buildCatalogRows(parseHygCsv(CSV), dup)).toThrow(/already matched/)
  })
})

describe("double stars", () => {
  const csv = [
    '"id","gl","ra","dec","dist","bayer","flam","con"',
    '1,"Gl 278A",7.5,31.9,15,Alp,66,Gem',
    '2,"Gl 278B",7.5,31.9,15,Alp,66,Gem',
    "3,,1.0,1.0,20,,77,Psc",
    "4,,1.0,1.0,20,,77,Psc",
    "5,,2.0,2.0,20,Bet,,Psc",
  ].join("\n")

  it("tells components apart by the letter ending their Gliese label", () => {
    const { rows } = buildCatalogRows(parseHygCsv(csv), [])
    expect(rows.map((row) => row[10])).toEqual(["A", "B", "", "", ""])
  })

  it("does not treat stars that only have variable names as one designation", () => {
    const variables = [
      '"id","gl","ra","dec","dist","con","var"',
      '1,"Gl 1A",1.0,1.0,20,Cet,UV',
      '2,"Gl 2B",2.0,2.0,20,Cet,YZ',
    ].join("\n")
    const { rows } = buildCatalogRows(parseHygCsv(variables), [])
    expect(rows.map((row) => row[10])).toEqual(["", ""])
  })
})

describe("buildLocalNames", () => {
  const { rows } = buildCatalogRows(parseHygCsv(CSV), CURATED)

  it("keys a table by English display name, including designations", () => {
    const names = buildLocalNames(rows, { Sirius: "シリウス", "HYG 102": "テスト星" })
    expect(names).toEqual({ "hyg-32263": "シリウス", "hyg-102": "テスト星" })
  })

  it("accepts designation names built from the Bayer letter or the Flamsteed number", () => {
    const csv = [
      '"id","gl","ra","dec","dist","bayer","flam","con"',
      '1,"Gl 178",4.8,7.0,8,Pi-3,1,Ori',
      '2,"Gl 820A",21.1,38.7,3.5,,61,Cyg',
      '3,"Gl 820B",21.1,38.7,3.5,,61,Cyg',
    ].join("\n")
    const doubles = buildCatalogRows(parseHygCsv(csv), []).rows
    const table = { "Pi3 Orionis": "オリオン座π3星", "61 Cygni B": "はくちょう座61番星B" }
    expect(buildLocalNames(doubles, table)).toEqual({
      "hyg-1": "オリオン座π3星",
      "hyg-3": "はくちょう座61番星B",
    })
  })

  it("rejects empty or non-string names", () => {
    expect(() => buildLocalNames(rows, { Sirius: "" })).toThrow(/non-empty/)
    expect(() => buildLocalNames(rows, { Sirius: 1 })).toThrow(/non-empty/)
  })

  it("fails on a name that matches no star", () => {
    expect(() => buildLocalNames(rows, { Sirus: "シリウス" })).toThrow(/Sirus/)
  })

  it("fails on a name shared by several stars", () => {
    const twins = buildCatalogRows(
      parseHygCsv(['"id","ra","dec","dist","proper"', "1,1,1,5,Twin", "2,2,2,5,Twin"].join("\n")),
      [],
    ).rows
    expect(() => buildLocalNames(twins, { Twin: "双子" })).toThrow(/2 stars/)
  })
})

describe("serializeCatalog", () => {
  it("produces JSON that parses back to the same file", () => {
    const { rows } = buildCatalogRows(parseHygCsv(CSV), CURATED)
    const file = createCatalogFile(rows, {
      source: "test",
      license: "CC BY-SA 4.0",
      generatedAt: "2026-10-20",
      maxDistanceLy: 173.2,
    })
    const text = serializeCatalog(file)
    expect(JSON.parse(text)).toEqual(file)
    expect(text.split("\n").length).toBeGreaterThan(rows.length)
  })
})
