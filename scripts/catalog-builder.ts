import { LY_PER_PC } from "../src/astro/units"
import { MAX_OBSERVER_DISTANCE_LY } from "../src/astro/visibility"
import {
  CATALOG_FIELDS,
  CATALOG_VERSION,
  type CatalogFile,
  type CatalogMeta,
  type CatalogRow,
} from "../src/catalog/types"

// Twice the observer limit: an observer at the limit still has its whole cube populated.
export const MAX_CATALOG_DISTANCE_LY = MAX_OBSERVER_DISTANCE_LY * 2
const SOL_ID = "0"
const FUZZY_TOLERANCE = { distLy: 0.65, raH: 0.03, decDeg: 0.7 }

export interface HygRecord {
  id: string
  proper: string
  gl: string
  hip: string
  hd: string
  raH: number
  decDeg: number
  distLy: number
  spect: string
  mag: number | null
}

export interface CuratedStar {
  name: string
  nameJa: string
  distLy: number
  raH: number
  decDeg: number
  spec: string
  priority: number
  hip?: string
  hyg?: string
  /** HYG's parallax is known to be wrong for this star; keep the curated distLy. */
  trustCuratedDistance?: boolean
}

export interface MatchLog {
  curated: string
  method: "hyg" | "hip" | "fuzzy" | "none"
  hygId?: string
  detail: string
}

const round = (value: number, digits: number): number => Number(value.toFixed(digits))

// Number("") is 0, which would silently turn a blank cell into a real value.
const parseNumber = (text: string): number => (text === "" ? NaN : Number(text))

export function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (ch === "," && !quoted) {
      fields.push(field)
      field = ""
    } else {
      field += ch
    }
  }
  fields.push(field)
  return fields
}

export function parseHygCsv(csv: string, maxDistanceLy = MAX_CATALOG_DISTANCE_LY): HygRecord[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/)
  const header = parseCsvLine(lines[0] ?? "").map((name) => name.trim().toLowerCase())
  const index = new Map(header.map((name, i) => [name, i]))
  for (const required of ["id", "ra", "dec", "dist"]) {
    if (!index.has(required)) {
      throw new Error(`Not a HYG CSV: missing column "${required}"`)
    }
  }

  const records: HygRecord[] = []
  for (const line of lines.slice(1)) {
    if (!line) continue
    const cells = parseCsvLine(line)
    const get = (name: string): string => {
      const i = index.get(name)
      return i === undefined ? "" : (cells[i] ?? "").trim()
    }
    const id = get("id")
    const distPc = parseNumber(get("dist"))
    if (!Number.isFinite(distPc) || distPc < 0) continue
    if (distPc === 0 && id !== SOL_ID) continue
    const distLy = distPc * LY_PER_PC
    if (distLy > maxDistanceLy) continue
    const raH = parseNumber(get("ra"))
    const decDeg = parseNumber(get("dec"))
    if (!Number.isFinite(raH) || !Number.isFinite(decDeg)) continue
    if (raH < 0 || raH > 24 || decDeg < -90 || decDeg > 90) continue
    const mag = parseNumber(get("mag"))
    records.push({
      id,
      proper: get("proper"),
      gl: get("gl"),
      hip: get("hip"),
      hd: get("hd"),
      raH,
      decDeg,
      distLy,
      spect: get("spect"),
      mag: Number.isFinite(mag) ? mag : null,
    })
  }
  return records
}

// HYG's gl column already carries its prefix ("Gl 244A", "GJ 1293").
export function hygCatalogLabel(record: HygRecord): string {
  if (record.gl) return record.gl
  if (record.hip) return `HIP ${record.hip}`
  if (record.hd) return `HD ${record.hd}`
  return `HYG ${record.id}`
}

// Uppercase D marks a white dwarf; HYG's older lowercase "d" prefix (dM5.5e) means a dwarf.
function spectralClass(spect: string): string {
  if (spect.startsWith("D")) return "D"
  return spect.toUpperCase().match(/[OBAFGKM]/)?.[0] ?? ""
}

function raDifference(a: number, b: number): number {
  const d = Math.abs(a - b) % 24
  return Math.min(d, 24 - d)
}

function fuzzyMatch(star: CuratedStar, records: HygRecord[]): HygRecord | undefined {
  let best: HygRecord | undefined
  let bestScore = Infinity
  for (const record of records) {
    const dd = Math.abs(record.distLy - star.distLy)
    const dr = raDifference(record.raH, star.raH)
    const dc = Math.abs(record.decDeg - star.decDeg)
    if (dd >= FUZZY_TOLERANCE.distLy || dr >= FUZZY_TOLERANCE.raH || dc >= FUZZY_TOLERANCE.decDeg) {
      continue
    }
    const score =
      dd / FUZZY_TOLERANCE.distLy + dr / FUZZY_TOLERANCE.raH + dc / FUZZY_TOLERANCE.decDeg
    if (score < bestScore) {
      best = record
      bestScore = score
    }
  }
  return best
}

function findExplicitMatch(
  star: CuratedStar,
  byId: Map<string, HygRecord>,
  byHip: Map<string, HygRecord>,
): HygRecord | undefined {
  const key = star.hyg ?? star.hip
  if (key === undefined) return undefined
  const record = star.hyg !== undefined ? byId.get(star.hyg) : byHip.get(key)
  const kind = star.hyg !== undefined ? "HYG" : "HIP"
  if (!record) {
    throw new Error(`${star.name}: ${kind} ID ${key} not found in HYG`)
  }
  const tolerance = Math.max(1, star.distLy * 0.1)
  if (!star.trustCuratedDistance && Math.abs(record.distLy - star.distLy) > tolerance) {
    throw new Error(
      `${star.name}: distance mismatch (curated ${star.distLy} ly / HYG ${record.distLy.toFixed(2)} ly)`,
    )
  }
  return record
}

export function buildCatalogRows(
  records: HygRecord[],
  curatedStars: CuratedStar[],
): { rows: CatalogRow[]; logs: MatchLog[] } {
  const byId = new Map(records.map((r) => [r.id, r]))
  const byHip = new Map(records.filter((r) => r.hip).map((r) => [r.hip, r]))
  const overrides = new Map<string, CuratedStar>()
  const extras: CatalogRow[] = []
  const logs: MatchLog[] = []

  curatedStars.forEach((star, index) => {
    const explicit = findExplicitMatch(star, byId, byHip)
    const hasExplicitId = star.hyg !== undefined || star.hip !== undefined
    const match = explicit ?? (hasExplicitId ? undefined : fuzzyMatch(star, records))
    if (!match) {
      extras.push([
        `curated-${index}`,
        star.name,
        star.nameJa,
        "",
        round(star.distLy, 3),
        round(star.raH, 6),
        round(star.decDeg, 5),
        star.spec,
        null,
        star.priority,
      ])
      logs.push({
        curated: star.name,
        method: "none",
        detail: "not in HYG; added from curated values",
      })
      return
    }
    const claimedBy = overrides.get(match.id)
    if (claimedBy) {
      throw new Error(`${star.name}: HYG ${match.id} already matched by ${claimedBy.name}`)
    }
    overrides.set(match.id, star)
    logs.push({
      curated: star.name,
      method: explicit ? (star.hyg !== undefined ? "hyg" : "hip") : "fuzzy",
      hygId: match.id,
      detail: `${hygCatalogLabel(match)} ${match.distLy.toFixed(2)} ly`,
    })
  })

  const rows = records.map((record): CatalogRow => {
    const star = overrides.get(record.id)
    const label = hygCatalogLabel(record)
    const name = star?.name ?? (record.proper || label)
    const basePriority = record.proper ? 4 : 0
    return [
      `hyg-${record.id}`,
      name,
      star?.nameJa ?? name,
      label,
      round(star?.trustCuratedDistance ? star.distLy : record.distLy, 3),
      round(record.raH, 6),
      round(record.decDeg, 5),
      spectralClass(record.spect),
      record.mag,
      Math.max(basePriority, star?.priority ?? 0),
    ]
  })

  return { rows: [...rows, ...extras], logs }
}

export function createCatalogFile(rows: CatalogRow[], meta: CatalogMeta): CatalogFile {
  return {
    version: CATALOG_VERSION,
    meta,
    fields: [...CATALOG_FIELDS],
    stars: rows,
  }
}

// One star per line keeps diffs of the generated file readable.
export function serializeCatalog(file: CatalogFile): string {
  const head = JSON.stringify({
    version: file.version,
    meta: file.meta,
    fields: file.fields,
  })
  const body = file.stars.map((row) => JSON.stringify(row)).join(",\n")
  return `${head.slice(0, -1)},"stars":[\n${body}\n]}\n`
}
