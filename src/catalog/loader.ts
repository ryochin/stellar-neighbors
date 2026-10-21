import { equatorialToCartesian, equatorialToGalactic, galacticAngles } from "../astro/coordinates"
import { formatDesignation } from "../i18n/catalog/designation"
import type { Locale } from "../i18n/locales"
import { normalizeSearchText } from "./search-text"
import {
  CATALOG_FIELDS,
  CATALOG_VERSION,
  LOCAL_NAMES_VERSION,
  type CatalogFile,
  type CatalogMeta,
  isNamesTable,
  type CatalogRow,
  type Designation,
  type LocalNamesFile,
  type Star,
} from "./types"

const SPECTRAL_COLORS: Record<string, string> = {
  O: "#97baff",
  B: "#a3c5ff",
  A: "#c2dfff",
  F: "#f2f9ff",
  G: "#ffe9b3",
  K: "#ffbe7f",
  M: "#ff897a",
  D: "#e0f6ff",
}
const UNKNOWN_SPECTRAL_COLOR = "#c0cbdc"

export interface Catalog {
  meta: CatalogMeta
  stars: Star[]
}

type FetchFn = (input: string) => Promise<Response>
const defaultFetch: FetchFn = (input) => fetch(input)

// HYG writes a Bayer letter with a superscript index as "Pi-3".
function toDesignation(row: CatalogRow): Designation | null {
  const [, , , bayer, flamsteed, constellation, component] = row
  if (!constellation || (!bayer && flamsteed === null)) return null
  const [letter, index] = bayer.split("-")
  return {
    bayer: letter || null,
    bayerIndex: index ? Number(index) : null,
    flamsteed,
    constellation,
    component,
  }
}

const searchTextOf = (star: Pick<Star, "name" | "localName" | "catalogLabel">): string =>
  normalizeSearchText([star.name, star.localName ?? "", star.catalogLabel].join("\n"))

export function rowToStar(row: CatalogRow): Star {
  const [id, properName, catalogLabel, , , , , distLy, raH, decDeg, spec, mag, priority] = row
  const designation = toDesignation(row)
  const name = properName || (designation && formatDesignation(designation, "en")) || catalogLabel
  const eq = equatorialToCartesian(raH, decDeg, distLy)
  const gal = equatorialToGalactic(eq)
  const angles = galacticAngles(gal)
  return {
    id,
    name,
    localName: null,
    catalogLabel,
    designation,
    searchText: searchTextOf({ name, localName: null, catalogLabel }),
    distLy,
    raH,
    decDeg,
    spec,
    mag,
    priority,
    color: SPECTRAL_COLORS[spec] ?? UNKNOWN_SPECTRAL_COLOR,
    eq,
    gal,
    l: angles?.l ?? null,
    b: angles?.b ?? null,
  }
}

export function parseCatalog(json: unknown): Catalog {
  const file = json as Partial<CatalogFile> | null
  if (!file || file.version !== CATALOG_VERSION) {
    throw new Error(`Unsupported catalog format (version: ${String(file?.version)})`)
  }
  if (!Array.isArray(file.fields) || file.fields.join(",") !== CATALOG_FIELDS.join(",")) {
    throw new Error("Unexpected catalog fields")
  }
  if (!Array.isArray(file.stars) || file.stars.length === 0) {
    throw new Error("Catalog contains no stars")
  }
  return { meta: file.meta as CatalogMeta, stars: file.stars.map(rowToStar) }
}

async function fetchJson(url: string, fetchFn: FetchFn): Promise<unknown> {
  const response = await fetchFn(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url} (HTTP ${response.status})`)
  return response.json()
}

export async function loadCatalog(url: string, fetchFn: FetchFn = defaultFetch): Promise<Catalog> {
  return parseCatalog(await fetchJson(url, fetchFn))
}

export function parseLocalNames(json: unknown, locale: Locale): Map<string, string> {
  const file = json as Partial<LocalNamesFile> | null
  if (!file || file.version !== LOCAL_NAMES_VERSION || file.locale !== locale) {
    throw new Error(`Unsupported names file (version: ${String(file?.version)}, locale: ${locale})`)
  }
  if (!isNamesTable(file.names)) throw new Error("Names file has invalid names")
  return new Map(Object.entries(file.names))
}

export async function loadLocalNames(
  url: string,
  locale: Locale,
  fetchFn: FetchFn = defaultFetch,
): Promise<Map<string, string>> {
  return parseLocalNames(await fetchJson(url, fetchFn), locale)
}

/** Stars with their names in `locale`: the locale's own table first, then the designation. */
export function withLocalNames(
  stars: readonly Star[],
  names: ReadonlyMap<string, string>,
  locale: Locale,
): Star[] {
  return stars.map((star) => {
    const localName =
      names.get(star.id) ??
      (star.designation && formatDesignation(star.designation, locale)) ??
      null
    return { ...star, localName, searchText: searchTextOf({ ...star, localName }) }
  })
}
