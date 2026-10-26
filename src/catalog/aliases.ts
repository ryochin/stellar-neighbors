import {
  abbreviatedDesignations,
  formatBayer,
  formatFlamsteed,
  formatVariableStar,
} from "../i18n/catalog/designation"
import type { Locale } from "../i18n/locales"
import type { CatalogIds, Designation, Star } from "./types"

/** Every catalog ID of a star, in display order: Gliese, HIP, HD, HR. */
export function catalogIdList({ gl, hip, hd, hr }: CatalogIds): string[] {
  const numbered: [string, number | null][] = [
    ["HIP", hip],
    ["HD", hd],
    ["HR", hr],
  ]
  const others: string[] = numbered.flatMap(([prefix, id]) =>
    id === null ? [] : [`${prefix} ${id}`],
  )
  return gl ? [gl, ...others] : others
}

/** The one catalog ID used as a fallback name: Gliese, else HIP, else HD. */
export const primaryCatalogId = (ids: CatalogIds): string =>
  catalogIdList({ ...ids, hr: null })[0] ?? ""

/** Bayer, Flamsteed and variable star names in `locale`, in that order. */
export function designationNames(star: Pick<Star, "designation">, locale: Locale): string[] {
  const { designation } = star
  if (!designation) return []
  const names: (string | null)[] = [formatBayer, formatFlamsteed, formatVariableStar].map(
    (format) => format(designation, locale),
  )
  return names.filter((name): name is string => name !== null)
}

/** Designations to list next to the star, without the ones already shown as its names. */
export function otherDesignations(star: Star, locale: Locale): string[] {
  const shown: string[] = [star.name, star.localName ?? ""]
  return designationNames(star, locale).filter((name) => !shown.includes(name))
}

/** Every name and ID that should find the star in search, in English and in `locale`. */
export function searchTerms(
  star: Pick<Star, "name" | "localName" | "catalogLabel" | "catalogIds" | "designation">,
  locale: Locale,
): string[] {
  const { designation } = star
  // "Alpha Centauri" should find Alpha1 and Alpha2 Centauri.
  const withoutIndex: Designation[] =
    !designation || designation.bayerIndex === null ? [] : [{ ...designation, bayerIndex: null }]
  return [
    star.name,
    star.localName ?? "",
    star.catalogLabel,
    ...catalogIdList(star.catalogIds),
    ...designationNames(star, "en"),
    ...(locale === "en" ? [] : designationNames(star, locale)),
    ...withoutIndex.flatMap((d) => [formatBayer(d, "en") ?? "", formatBayer(d, locale) ?? ""]),
    ...(designation ? abbreviatedDesignations(designation) : []),
  ]
}
