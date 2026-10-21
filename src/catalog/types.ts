export type Vec3 = readonly [number, number, number]

export const CATALOG_VERSION = 2

export const CATALOG_FIELDS = [
  "id",
  "name",
  "catalogLabel",
  "bayer",
  "flamsteed",
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
  catalogLabel: string,
  /** HYG Bayer letter with its superscript index ("Alp", "Pi-3"); empty when none. */
  bayer: string,
  flamsteed: number | null,
  /** IAU abbreviation; empty unless the star has a Bayer or Flamsteed designation. */
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
  constellation: string
  component: string
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
  /** Name in the additional locale: its own table, else its designation; null when it has neither. */
  localName: string | null
  catalogLabel: string
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
