import type { Star } from "./types"

/** Name to show: the UI locale's name when one is loaded, else the English name. */
export const displayName = (star: Star): string => star.localName ?? star.name

/** English name shown next to a different local name. */
export const secondaryName = (star: Star): string | null =>
  star.localName && star.localName !== star.name ? star.name : null
