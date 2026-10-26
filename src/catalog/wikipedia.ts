import { DEFAULT_LOCALE, type Locale } from "../i18n/locales"
import { defaultFetch, fetchJson, type FetchFn } from "./loader"

/** Wikipedia language code and article title ("en", "Sirius"). */
export type WikipediaArticle = readonly [wiki: string, title: string]

/** Articles for the stars in one locale, keyed by star id; built by `npm run build:wikipedia`. */
export interface WikipediaLinksFile {
  version: number
  locale: string
  source: string
  generatedAt: string
  articles: Record<string, WikipediaArticle>
}

export const WIKIPEDIA_LINKS_VERSION = 1

// The wiki goes into the link's host name, so only the locale's own wiki and the English one pass.
const isArticle = (value: unknown, locale: Locale): value is WikipediaArticle =>
  Array.isArray(value) &&
  value.length === 2 &&
  (value[0] === locale || value[0] === DEFAULT_LOCALE) &&
  typeof value[1] === "string" &&
  value[1] !== ""

export function parseWikipediaLinks(json: unknown, locale: Locale): Map<string, WikipediaArticle> {
  const file = json as Partial<WikipediaLinksFile> | null
  if (!file || file.version !== WIKIPEDIA_LINKS_VERSION || file.locale !== locale) {
    throw new Error(
      `Unsupported Wikipedia links file (version: ${String(file?.version)}, locale: ${locale})`,
    )
  }
  const articles = file.articles
  if (
    typeof articles !== "object" ||
    articles === null ||
    Array.isArray(articles) ||
    !Object.values(articles).every((article) => isArticle(article, locale))
  ) {
    throw new Error("Wikipedia links file has invalid articles")
  }
  return new Map(Object.entries(articles))
}

export async function loadWikipediaLinks(
  url: string,
  locale: Locale,
  fetchFn: FetchFn = defaultFetch,
): Promise<Map<string, WikipediaArticle>> {
  return parseWikipediaLinks(await fetchJson(url, fetchFn), locale)
}

/** Article URL in Wikipedia's own form: spaces become underscores, the rest is percent-encoded. */
export function wikipediaUrl([wiki, title]: WikipediaArticle): string {
  return `https://${wiki}.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`
}
