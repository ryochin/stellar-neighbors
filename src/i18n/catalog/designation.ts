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

interface DesignationParts {
  /** Greek letter with its superscript index, e.g. "Pi3" or "π3". */
  letter: string | null
  flamsteed: number | null
  constellation: string
  component: string
}

// Bayer letters win over Flamsteed numbers, as in common usage ("Tau Ceti", not "52 Ceti").
const FORMATS: Readonly<Record<Locale, (parts: DesignationParts) => string>> = {
  en: ({ letter, flamsteed, constellation, component }) =>
    [letter ?? flamsteed, constellation, component].filter(Boolean).join(" "),
  ja: ({ letter, flamsteed, constellation, component }) =>
    `${constellation}${letter ?? `${flamsteed}番`}星${component}`,
}

/** Localized Bayer or Flamsteed designation, or null when the star has none or a table lacks it. */
export function formatDesignation(designation: Designation, locale: Locale): string | null {
  const constellation = CONSTELLATIONS[designation.constellation]?.[locale]
  if (!constellation) return null
  const { bayer, bayerIndex, flamsteed, component } = designation
  const greek = bayer === null ? null : GREEK_LETTERS[bayer]?.[locale]
  if (bayer !== null && !greek) return null
  if (!greek && flamsteed === null) return null
  const letter = greek ? `${greek}${bayerIndex ?? ""}` : null
  return FORMATS[locale]({ letter, flamsteed, constellation, component })
}
