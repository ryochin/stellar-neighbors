import { existsSync } from "node:fs"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../src/i18n/locales"
import {
  MAX_CATALOG_DISTANCE_LY,
  buildCatalogRows,
  buildLocalNames,
  createCatalogFile,
  createLocalNamesFile,
  parseHygCsv,
  serializeCatalog,
  serializeLocalNames,
  type CuratedStar,
  type HygRecord,
} from "./catalog-builder"

const HYG_COMMIT = "3bf37f4b2d5460e1278286320d1d62fab9b493c1"
const HYG_URL = `https://raw.githubusercontent.com/astronexus/HYG-Database/${HYG_COMMIT}/hyg/CURRENT/hygdata_v41.csv`
// 9,594 stars were within range at the pinned commit; far fewer means a broken download.
const MIN_EXPECTED_STARS = 5000

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const cachePath = resolve(root, "data-src/cache/hygdata_v41.csv")
const curatedPath = resolve(root, "data-src/curated-stars.json")
const outputDir = resolve(root, "src/catalog/data")
const outputPath = resolve(outputDir, "stars.json")
// English names live in the catalog itself; every other locale has a hand-written table.
const namesTablePath = (locale: string): string => resolve(root, `data-src/names/${locale}.json`)
const namesOutputPath = (locale: string): string => resolve(outputDir, `names.${locale}.json`)

const round1 = (value: number): number => Number(value.toFixed(1))

function parseValidHygCsv(csv: string): HygRecord[] {
  const records = parseHygCsv(csv)
  if (records.length < MIN_EXPECTED_STARS) {
    throw new Error(`Too few stars in HYG CSV (${records.length})`)
  }
  return records
}

async function downloadHygRecords(): Promise<HygRecord[]> {
  console.log(`Downloading HYG: ${HYG_URL}`)
  const response = await fetch(HYG_URL)
  if (!response.ok) {
    throw new Error(`Failed to download HYG (HTTP ${response.status})`)
  }
  const csv = await response.text()
  const records = parseValidHygCsv(csv)
  // Write then rename, so an interrupted run never leaves a partial cache behind.
  const tempPath = `${cachePath}.tmp`
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(tempPath, csv)
  await rename(tempPath, cachePath)
  return records
}

async function loadHygRecords(): Promise<HygRecord[]> {
  if (!existsSync(cachePath)) return downloadHygRecords()
  console.log(`Using cache: ${cachePath}`)
  try {
    return parseValidHygCsv(await readFile(cachePath, "utf8"))
  } catch (error) {
    console.warn(`Ignoring invalid cache: ${error instanceof Error ? error.message : error}`)
    return downloadHygRecords()
  }
}

async function main(): Promise<void> {
  const records = await loadHygRecords()
  const curated = JSON.parse(await readFile(curatedPath, "utf8")) as CuratedStar[]
  const { rows, logs } = buildCatalogRows(records, curated)
  for (const log of logs) {
    const target = log.hygId ? ` -> HYG ${log.hygId}` : ""
    console.log(`[${log.method.padEnd(5)}] ${log.curated}${target}  ${log.detail}`)
  }
  const file = createCatalogFile(rows, {
    source: `HYG v4.1 (commit ${HYG_COMMIT.slice(0, 7)})`,
    license: "CC BY-SA 4.0 — David Nash / astronexus HYG Database",
    generatedAt: new Date().toISOString().slice(0, 10),
    maxDistanceLy: round1(MAX_CATALOG_DISTANCE_LY),
  })
  await mkdir(outputDir, { recursive: true })
  await writeFile(outputPath, serializeCatalog(file))
  console.log(`Wrote ${rows.length} stars to ${outputPath}`)

  for (const locale of SUPPORTED_LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
    const table: unknown = JSON.parse(await readFile(namesTablePath(locale), "utf8"))
    const names = buildLocalNames(rows, table)
    await writeFile(
      namesOutputPath(locale),
      serializeLocalNames(createLocalNamesFile(locale, names)),
    )
    console.log(`Wrote ${Object.keys(names).length} ${locale} names to ${namesOutputPath(locale)}`)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
