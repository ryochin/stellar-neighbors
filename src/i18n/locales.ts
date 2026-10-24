// Add a locale here, then give it a column in every table under src/i18n/.
export const SUPPORTED_LOCALES = ["en", "ja"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en"

const toSupported = (tag: string): Locale | undefined =>
  SUPPORTED_LOCALES.find((locale) => locale === tag.split("-")[0].toLowerCase())

/** First browser language whose primary subtag we support ("ja-JP" -> "ja"), else English. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const locale = toSupported(tag)
    if (locale) return locale
  }
  return DEFAULT_LOCALE
}

/** `?lang=ja` in the query string wins over the browser languages; it is not remembered. */
export function resolveLocale(search: string, languages: readonly string[]): Locale {
  const requested = new URLSearchParams(search).get("lang")
  return (requested && toSupported(requested)) || detectLocale(languages)
}
