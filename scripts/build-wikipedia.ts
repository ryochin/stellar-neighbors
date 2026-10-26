// Matches the catalog stars to Wikipedia articles through Wikidata and writes one links file per
// locale. Rerun it after `npm run build:catalog` whenever the star ids change.
import { readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseCatalog } from "../src/catalog/loader"
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../src/i18n/locales"
import {
  CATALOG_ITEMS,
  buildArticles,
  catalogSitelinksQuery,
  createWikipediaLinksFile,
  glieseKey,
  hipKey,
  indexSitelinks,
  itemSitelinksQuery,
  localeArticles,
  parseSitelinkRows,
  serializeWikipediaLinks,
  type SitelinkRow,
} from "./wikipedia-builder"

const SPARQL_URL = "https://query.wikidata.org/sparql"
// Wikimedia asks scripts to name themselves in the User-Agent.
const USER_AGENT = "stellar-neighborhood-build/0.1 (build:wikipedia script)"
// No catalog code reaches these stars.
const STAR_ITEMS: Record<string, string> = { "hyg-0": "Q525" }
// About 1,460 stars had an English article on 2026-10-26; far fewer means a broken query.
const MIN_EXPECTED_ARTICLES = 1000

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const dataDir = resolve(root, "src/catalog/data")
const catalogPath = resolve(dataDir, "stars.json")
const outputPath = (locale: string): string => resolve(dataDir, `wikipedia.${locale}.json`)

// Wikipedia language codes match our locales for now.
const WIKIS: readonly string[] = SUPPORTED_LOCALES

async function runQuery(label: string, query: string): Promise<SitelinkRow[]> {
  const started = Date.now()
  const response = await fetch(SPARQL_URL, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ query }),
  })
  if (!response.ok) throw new Error(`Wikidata query "${label}" failed (HTTP ${response.status})`)
  const rows = parseSitelinkRows(await response.json())
  console.log(`[${label}] ${rows.length} rows in ${((Date.now() - started) / 1000).toFixed(1)} s`)
  return rows
}

async function main(): Promise<void> {
  const { stars } = parseCatalog(JSON.parse(await readFile(catalogPath, "utf8")))
  // One query at a time, as Wikimedia asks of bulk clients.
  const hipRows = await runQuery("HIP", catalogSitelinksQuery(CATALOG_ITEMS.hip, WIKIS))
  const glieseRows = await runQuery("Gliese", catalogSitelinksQuery(CATALOG_ITEMS.gliese, WIKIS))
  const itemRows = await runQuery("items", itemSitelinksQuery(Object.values(STAR_ITEMS), WIKIS))

  const { articles, ambiguities } = buildArticles(
    stars,
    {
      hip: indexSitelinks(hipRows, hipKey),
      gliese: indexSitelinks(glieseRows, glieseKey),
      items: indexSitelinks(itemRows, (code) => code),
      starItems: STAR_ITEMS,
    },
    WIKIS,
  )
  for (const { starId, wiki, titles } of ambiguities) {
    console.log(`[ambiguous] ${starId} ${wiki}: ${titles.join(" | ")} -> ${titles[0]}`)
  }
  for (const wiki of WIKIS) {
    const count = [...articles.values()].filter((byWiki) => byWiki.has(wiki)).length
    console.log(`${count} stars have a ${wiki} article`)
  }
  const englishCount = [...articles.values()].filter((byWiki) => byWiki.has(DEFAULT_LOCALE)).length
  if (englishCount < MIN_EXPECTED_ARTICLES) {
    throw new Error(`Too few English articles (${englishCount}); is the query broken?`)
  }

  const meta = { source: "Wikidata (CC0)", generatedAt: new Date().toISOString().slice(0, 10) }
  for (const locale of SUPPORTED_LOCALES) {
    const links = localeArticles(articles, locale)
    await writeFile(
      outputPath(locale),
      serializeWikipediaLinks(createWikipediaLinksFile(locale, links, meta)),
    )
    console.log(`Wrote ${Object.keys(links).length} ${locale} links to ${outputPath(locale)}`)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
