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

/** Japanese name when it adds something; most HYG stars just repeat the catalog ID. */
export const secondaryName = (star: Star): string | null =>
  star.nameJa && star.nameJa !== star.name ? star.nameJa : null
