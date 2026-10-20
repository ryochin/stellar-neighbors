export type Vec3 = readonly [number, number, number]

export const CATALOG_VERSION = 1

export const CATALOG_FIELDS = [
  "id",
  "name",
  "nameJa",
  "catalogLabel",
  "distLy",
  "raH",
  "decDeg",
  "spec",
  "mag",
  "priority",
] as const

export type CatalogRow = [
  id: string,
  name: string,
  nameJa: string,
  catalogLabel: string,
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

export interface Star {
  id: string
  name: string
  /** Japanese name, kept for i18n. */
  nameJa: string
  catalogLabel: string
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
