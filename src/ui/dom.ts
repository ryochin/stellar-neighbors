import type { Star } from "../catalog/types"

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`#${id} not found`)
  return element as T
}

/** Name in the additional locale when it adds something. */
export const secondaryName = (star: Star): string | null =>
  star.localName && star.localName !== star.name ? star.localName : null
