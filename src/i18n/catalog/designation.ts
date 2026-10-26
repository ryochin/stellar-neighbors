import type { Designation } from "../../catalog/types"
import type { Locale } from "../locales"
import { CONSTELLATIONS } from "./constellations"

// Bayer letters by HYG's abbreviation.
const GREEK_LETTERS: Readonly<Record<string, Readonly<Record<Locale, string>>>> = {
  Alp: { en: "Alpha", ja: "α" },
  Bet: { en: "Beta", ja: "β" },
  Gam: { en: "Gamma", ja: "γ" },
  Del: { en: "Delta", ja: "δ" },
  Eps: { en: "Epsilon", ja: "ε" },
  Zet: { en: "Zeta", ja: "ζ" },
  Eta: { en: "Eta", ja: "η" },
  The: { en: "Theta", ja: "θ" },
  Iot: { en: "Iota", ja: "ι" },
  Kap: { en: "Kappa", ja: "κ" },
  Lam: { en: "Lambda", ja: "λ" },
  Mu: { en: "Mu", ja: "μ" },
  Nu: { en: "Nu", ja: "ν" },
  Xi: { en: "Xi", ja: "ξ" },
  Omi: { en: "Omicron", ja: "ο" },
  Pi: { en: "Pi", ja: "π" },
  Rho: { en: "Rho", ja: "ρ" },
  Sig: { en: "Sigma", ja: "σ" },
  Tau: { en: "Tau", ja: "τ" },
  Ups: { en: "Upsilon", ja: "υ" },
  Phi: { en: "Phi", ja: "φ" },
  Chi: { en: "Chi", ja: "χ" },
  Psi: { en: "Psi", ja: "ψ" },
  Ome: { en: "Omega", ja: "ω" },
}

/** True for HYG's Greek letter abbreviations, with or without an index ("Alp", "Kap-1"). */
export const isGreekLetter = (abbreviation: string): boolean =>
  Object.hasOwn(GREEK_LETTERS, abbreviation.split("-")[0])

// The label is the Greek letter, the Flamsteed number or the variable star prefix.
const FORMATS: Readonly<
  Record<Locale, (label: string, constellation: string, component: string) => string>
> = {
  en: (label, constellation, component) =>
    [label, constellation, component].filter(Boolean).join(" "),
  ja: (label, constellation, component) => `${constellation}${label}星${component}`,
}

const FLAMSTEED_LABELS: Readonly<Record<Locale, (flamsteed: number) => string>> = {
  en: (flamsteed) => `${flamsteed}`,
  ja: (flamsteed) => `${flamsteed}番`,
}

const bayerLetter = (designation: Designation, locale: Locale): string | null => {
  const greek = designation.bayer === null ? null : GREEK_LETTERS[designation.bayer]?.[locale]
  return greek ? `${greek}${designation.bayerIndex ?? ""}` : null
}

/** Localized Bayer designation ("Alpha2 Centauri B"), or null when the star has none. */
export function formatBayer(designation: Designation, locale: Locale): string | null {
  const constellation = CONSTELLATIONS[designation.constellation]?.[locale]
  const letter = bayerLetter(designation, locale)
  if (!constellation || !letter) return null
  return FORMATS[locale](letter, constellation, designation.component)
}

/** Localized Flamsteed designation ("61 Cygni A"), or null when the star has none. */
export function formatFlamsteed(designation: Designation, locale: Locale): string | null {
  const constellation = CONSTELLATIONS[designation.constellation]?.[locale]
  const { flamsteed, component } = designation
  if (!constellation || flamsteed === null) return null
  return FORMATS[locale](FLAMSTEED_LABELS[locale](flamsteed), constellation, component)
}

/** Localized variable star name ("UV Ceti"), or null when the star has none. */
export function formatVariableStar(designation: Designation, locale: Locale): string | null {
  const constellation = CONSTELLATIONS[designation.constellation]?.[locale]
  if (!constellation || !designation.variable) return null
  return FORMATS[locale](designation.variable, constellation, "")
}

/**
 * Localized name built from the designation: Bayer letters win over Flamsteed numbers, as in
 * common usage ("Tau Ceti", not "52 Ceti"). Variable star names never become the name.
 */
export const formatDesignation = (designation: Designation, locale: Locale): string | null =>
  formatBayer(designation, locale) ?? formatFlamsteed(designation, locale)

/**
 * Short forms with the IAU abbreviation, for search only ("α CMa", "Alpha CMa", "9 CMa").
 * Indexed letters also come without the index, so "α Cen" finds α1 and α2 Centauri.
 */
export function abbreviatedDesignations(designation: Designation): string[] {
  const { bayer, bayerIndex, flamsteed, variable, constellation } = designation
  const greek = bayer === null ? undefined : GREEK_LETTERS[bayer]
  // The ja letters are the Greek symbols themselves.
  const letters = greek ? [greek.en, greek.ja, bayer] : []
  const indexes = bayerIndex === null ? [""] : [`${bayerIndex}`, ""]
  return [
    ...letters.flatMap((letter) => indexes.map((index) => `${letter}${index} ${constellation}`)),
    ...(flamsteed === null ? [] : [`${flamsteed} ${constellation}`]),
    ...(variable ? [`${variable} ${constellation}`] : []),
  ]
}
