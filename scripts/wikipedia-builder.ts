import type { CatalogIds } from "../src/catalog/types"
import {
  WIKIPEDIA_LINKS_VERSION,
  type WikipediaArticle,
  type WikipediaLinksFile,
} from "../src/catalog/wikipedia"
import { DEFAULT_LOCALE, type Locale } from "../src/i18n/locales"

/** Wikidata items of the catalogs we match on (the P972 "catalog" qualifier of P528). */
export const CATALOG_ITEMS = { hip: "Q537199", gliese: "Q1045111" } as const

// A component's article usually lives on its star system; only follow "part of" to these classes,
// which keeps out the open clusters and asterisms seen when the query was designed. An item can
// have several classes, so this narrows the parents rather than guaranteeing a star system.
const SYSTEM_CLASSES = [
  "Q50053", // binary star
  "Q13890", // double star
  "Q878367", // multiple star
  "Q2088753", // triple star system
  "Q43001876", // pair of stars
  "Q1993624", // spectroscopic binary
  "Q523", // star
]

export type Via = "self" | "parent"

export interface SitelinkRow {
  /** Catalog code ("HIP 32349") or item id ("Q525"). */
  code: string
  via: Via
  wiki: string
  title: string
}

const wikiValues = (wikis: readonly string[]): string =>
  wikis.map((wiki) => `<https://${wiki}.wikipedia.org/>`).join(" ")

// The articles of an item and of the star system it is part of, in every wiki asked for.
const ARTICLE_PATTERNS = `{
    ?article schema:about ?item ; schema:isPartOf ?site ; schema:name ?title .
    BIND("self" AS ?via)
  } UNION {
    ?item wdt:P361 ?parent .
    ?parent wdt:P31 ?class .
    VALUES ?class { ${SYSTEM_CLASSES.map((id) => `wd:${id}`).join(" ")} }
    ?article schema:about ?parent ; schema:isPartOf ?site ; schema:name ?title .
    BIND("parent" AS ?via)
  }`

/** Every code of `catalogItem` that has an article, directly or through its star system. */
export function catalogSitelinksQuery(catalogItem: string, wikis: readonly string[]): string {
  return `SELECT ?code ?via ?site ?title WHERE {
  ?item p:P528 ?statement .
  ?statement ps:P528 ?code ; pq:P972 wd:${catalogItem} .
  VALUES ?site { ${wikiValues(wikis)} }
  ${ARTICLE_PATTERNS}
}`
}

/** Articles of the given items, for stars no catalog code reaches (the Sun). */
export function itemSitelinksQuery(items: readonly string[], wikis: readonly string[]): string {
  return `SELECT ?code ?via ?site ?title WHERE {
  VALUES ?item { ${items.map((id) => `wd:${id}`).join(" ")} }
  BIND(STRAFTER(STR(?item), "/entity/") AS ?code)
  VALUES ?site { ${wikiValues(wikis)} }
  ${ARTICLE_PATTERNS}
}`
}

interface SparqlBinding {
  [name: string]: { value: string } | undefined
}

/** Rows of a SPARQL JSON result; rows from sites other than Wikipedia language editions are dropped. */
export function parseSitelinkRows(json: unknown): SitelinkRow[] {
  const bindings = (json as { results?: { bindings?: SparqlBinding[] } }).results?.bindings
  if (!Array.isArray(bindings)) throw new Error("Unexpected SPARQL result")
  return bindings.flatMap((binding) => {
    const code = binding.code?.value
    const via = binding.via?.value
    const wiki = binding.site?.value.match(/^https:\/\/([a-z-]+)\.wikipedia\.org\/$/)?.[1]
    const title = binding.title?.value
    if (!code || (via !== "self" && via !== "parent") || !wiki || !title) return []
    return [{ code, via, wiki, title }]
  })
}

/** "HIP 32349" -> "32349"; codes of planets ("HIP 41378 f") give null. */
export function hipKey(code: string): string | null {
  return code.match(/^HIP\s+(\d+)$/)?.[1] ?? null
}

/** "Gl 244A", "GJ 244 A" -> "244A"; planets ("GJ 876 b") give null. */
export function glieseKey(label: string): string | null {
  const match = label.match(/^(?:GJ|Gl|Gliese)\s*(\d+(?:\.\d+)?)\s*([A-D]?)$/)
  return match ? `${match[1]}${match[2]}` : null
}

export interface TitleChoice {
  self: Set<string>
  parent: Set<string>
}

/** key -> wiki -> titles found for that key, split by how they were reached. */
export type TitleIndex = Map<string, Map<string, TitleChoice>>

export function indexSitelinks(
  rows: readonly SitelinkRow[],
  keyOf: (code: string) => string | null,
): TitleIndex {
  const index: TitleIndex = new Map()
  for (const { code, via, wiki, title } of rows) {
    const key = keyOf(code)
    if (key === null) continue
    const byWiki = index.get(key) ?? new Map<string, TitleChoice>()
    index.set(key, byWiki)
    const choice = byWiki.get(wiki) ?? { self: new Set<string>(), parent: new Set<string>() }
    byWiki.set(wiki, choice)
    choice[via].add(title)
  }
  return index
}

export interface StarIds {
  id: string
  catalogIds: CatalogIds
}

export interface ArticleSources {
  hip: TitleIndex
  gliese: TitleIndex
  items: TitleIndex
  /** Star id -> Wikidata item, for stars without a usable catalog code. */
  starItems: Readonly<Record<string, string>>
}

export interface AmbiguityLog {
  starId: string
  wiki: string
  titles: string[]
}

/** The keys to look a star up by, best first: its own item, then HIP, then Gliese. */
function lookups(star: StarIds, sources: ArticleSources): [TitleIndex, string | null][] {
  const { hip, gl } = star.catalogIds
  return [
    [sources.items, sources.starItems[star.id] ?? null],
    [sources.hip, hip === null ? null : String(hip)],
    [sources.gliese, gl ? glieseKey(gl) : null],
  ]
}

/**
 * Article titles per star and wiki. For each wiki the first lookup that has an article wins, and
 * within it the item's own article beats its star system's. Ties go to the first title in code
 * point order, so reruns stay stable, and are logged.
 */
export function buildArticles(
  stars: readonly StarIds[],
  sources: ArticleSources,
  wikis: readonly string[],
): { articles: Map<string, Map<string, string>>; ambiguities: AmbiguityLog[] } {
  const articles = new Map<string, Map<string, string>>()
  const ambiguities: AmbiguityLog[] = []
  for (const star of stars) {
    const byWiki = new Map<string, string>()
    for (const wiki of wikis) {
      for (const [index, key] of lookups(star, sources)) {
        const choice = key === null ? undefined : index.get(key)?.get(wiki)
        const titles = choice && (choice.self.size > 0 ? choice.self : choice.parent)
        if (!titles || titles.size === 0) continue
        const sorted = [...titles].sort()
        if (sorted.length > 1) ambiguities.push({ starId: star.id, wiki, titles: sorted })
        byWiki.set(wiki, sorted[0])
        break
      }
    }
    if (byWiki.size > 0) articles.set(star.id, byWiki)
  }
  return { articles, ambiguities }
}

/** The article to open in `locale`: its own wiki, else the English one. */
export function localeArticles(
  articles: ReadonlyMap<string, ReadonlyMap<string, string>>,
  locale: Locale,
): Record<string, WikipediaArticle> {
  const result: Record<string, WikipediaArticle> = {}
  for (const [starId, byWiki] of articles) {
    const wiki = byWiki.has(locale) ? locale : DEFAULT_LOCALE
    const title = byWiki.get(wiki)
    if (title) result[starId] = [wiki, title]
  }
  return result
}

export function createWikipediaLinksFile(
  locale: Locale,
  articles: Record<string, WikipediaArticle>,
  meta: { source: string; generatedAt: string },
): WikipediaLinksFile {
  return { version: WIKIPEDIA_LINKS_VERSION, locale, ...meta, articles }
}

/** Pretty JSON with one article per line, so diffs between runs stay readable. */
export function serializeWikipediaLinks(file: WikipediaLinksFile): string {
  const { articles, ...head } = file
  const headLines = Object.entries(head).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  )
  const articleLines = Object.entries(articles).map(
    ([id, [wiki, title]]) =>
      `    ${JSON.stringify(id)}: [${JSON.stringify(wiki)}, ${JSON.stringify(title)}]`,
  )
  return `{\n${headLines.join("\n")}\n  "articles": {\n${articleLines.join(",\n")}\n  }\n}\n`
}
