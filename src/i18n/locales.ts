// Add a locale here, then give it a column in every table under src/i18n/.
export const SUPPORTED_LOCALES = ["en", "ja"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en"
