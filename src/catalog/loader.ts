import { equatorialToCartesian, equatorialToGalactic, galacticAngles } from "../astro/coordinates"
import {
  CATALOG_FIELDS,
  CATALOG_VERSION,
  type CatalogFile,
  type CatalogMeta,
  type CatalogRow,
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

export function rowToStar(row: CatalogRow): Star {
  const [id, name, nameJa, catalogLabel, distLy, raH, decDeg, spec, mag, priority] = row
  const eq = equatorialToCartesian(raH, decDeg, distLy)
  const gal = equatorialToGalactic(eq)
  const angles = galacticAngles(gal)
  return {
    id,
    name,
    nameJa,
    catalogLabel,
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

export async function loadCatalog(
  url: string,
  fetchFn: (input: string) => Promise<Response> = (input) => fetch(input),
): Promise<Catalog> {
  const response = await fetchFn(url)
  if (!response.ok) throw new Error(`Failed to fetch catalog (HTTP ${response.status})`)
  return parseCatalog(await response.json())
}
