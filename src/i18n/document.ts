import type { Locale } from "./locales"
import type { Messages, PageKey } from "./messages/en"

// data-i18n* attribute -> how its message is applied. The messages are ours, so innerHTML is safe.
const TARGETS: readonly [attribute: string, apply: (element: Element, text: string) => void][] = [
  ["data-i18n", (element, text) => (element.textContent = text)],
  ["data-i18n-html", (element, text) => (element.innerHTML = text)],
  ["data-i18n-title", (element, text) => element.setAttribute("title", text)],
  ["data-i18n-aria-label", (element, text) => element.setAttribute("aria-label", text)],
  ["data-i18n-placeholder", (element, text) => element.setAttribute("placeholder", text)],
]

export const I18N_ATTRIBUTES: readonly string[] = TARGETS.map(([attribute]) => attribute)

/** Replace the English text of index.html with `messages`; the HTML keeps English as a fallback. */
export function applyDocumentTranslations(doc: Document, locale: Locale, messages: Messages): void {
  doc.documentElement.lang = locale
  doc.title = messages.page.title
  for (const [attribute, apply] of TARGETS) {
    for (const element of doc.querySelectorAll(`[${attribute}]`)) {
      const key = element.getAttribute(attribute) as PageKey
      const text = messages.page[key]
      if (text === undefined) throw new Error(`Unknown ${attribute} key: ${key}`)
      apply(element, text)
    }
  }
}
