export type Vec3 = readonly [number, number, number]

export const CATALOG_VERSION = 3

export const CATALOG_FIELDS = [
  "id",
  "name",
  "gl",
  "hip",
  "hd",
  "hr",
  "bayer",
  "flamsteed",
  "variable",
  "constellation",
  "component",
  "distLy",
  "raH",
  "decDeg",
  "spec",
  "mag",
  "priority",
] as const

export type CatalogRow = [
  id: string,
  /** English proper name; empty when the star only has a designation or a catalog ID. */
  name: string,
  /** Gliese / GJ number with its prefix, as in HYG ("Gl 244A", "GJ 1061"). */
  gl: string,
  hip: number | null,
  hd: number | null,
  hr: number | null,
  /** HYG Bayer letter with its superscript index ("Alp", "Pi-3"); empty when none. */
  bayer: string,
  flamsteed: number | null,
  /** Variable star prefix without the constellation ("UV", "V645"); empty when none. */
  variable: string,
  /** IAU abbreviation; empty unless the star has a designation or a variable star name. */
  constellation: string,
  /** "A" / "B" when several stars share one designation. */
  component: string,
  distLy: number,
  raH: number,
  decDeg: number,
  spec: string,
  mag: number | null,
  priority: number,
]

export interface CatalogMeta {
  source: string
  license: string
  generatedAt: string
  maxDistanceLy: number
}

export interface CatalogFile {
  version: number
  meta: CatalogMeta
  fields: string[]
  stars: CatalogRow[]
}

export interface Designation {
  /** Greek letter abbreviation as in HYG ("Alp"). */
  bayer: string | null
  /** Superscript index of the Bayer letter (the 3 of Pi3 Orionis). */
  bayerIndex: number | null
  flamsteed: number | null
  /** Variable star prefix ("UV", "V645"). */
  variable: string | null
  constellation: string
  component: string
}

export interface CatalogIds {
  gl: string
  hip: number | null
  hd: number | null
  hr: number | null
}

/** Names of the stars in one locale, keyed by star id. */
export interface LocalNamesFile {
  version: number
  locale: string
  names: Record<string, string>
}

export const LOCAL_NAMES_VERSION = 1

/** A names table is a plain object of non-empty strings; an empty name would hide the designation. */
export const isNamesTable = (value: unknown): value is Record<string, string> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((name) => typeof name === "string" && name !== "")

export interface Star {
  id: string
  /** English display name: proper name, else designation, else catalog ID. */
  name: string
  /**
   * Name in the UI locale when it is not English: its own table, else its designation; null in
   * English or when the star has neither.
   */
  localName: string | null
  /** The one catalog ID used as a fallback name: Gliese, else HIP, else HD. */
  catalogLabel: string
  catalogIds: CatalogIds
  /** Bayer, Flamsteed and variable star names; null when the star has none. */
  designation: Designation | null
  /** Lowercased names without diacritics, for search. */
  searchText: string
  distLy: number
  raH: number
  decDeg: number
  spec: string
  mag: number | null
  priority: number
  color: string
  /** Sun-centered J2000 equatorial cartesian position in ly. */
  eq: Vec3
  /** Sun-centered galactic cartesian position in ly. */
  gal: Vec3
  l: number | null
  b: number | null
}
