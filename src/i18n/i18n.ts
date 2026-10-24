import { convertDistance, type UnitMode } from "../astro/units"
import type { Locale } from "./locales"
import { en, type Messages } from "./messages/en"
import { ja } from "./messages/ja"

export const MESSAGES: Record<Locale, Messages> = { en, ja }

export interface DistanceParts {
  value: string
  unit: string
}

export interface I18n {
  locale: Locale
  t: Messages
  formatInteger(value: number): string
  distanceParts(ly: number, mode: UnitMode): DistanceParts
  formatDistance(ly: number, mode: UnitMode): string
}

export function createI18n(locale: Locale): I18n {
  const t = MESSAGES[locale]
  const formatters = new Map<number, Intl.NumberFormat>()
  const formatFixed = (value: number, digits: number): string => {
    let formatter = formatters.get(digits)
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
      formatters.set(digits, formatter)
    }
    return formatter.format(value)
  }
  const distanceParts = (ly: number, mode: UnitMode): DistanceParts => {
    const { value, digits } = convertDistance(ly, mode)
    return { value: formatFixed(value, digits), unit: t.units[mode].label }
  }
  return {
    locale,
    t,
    formatInteger: (value) => formatFixed(value, 0),
    distanceParts,
    formatDistance: (ly, mode) => {
      const { value, unit } = distanceParts(ly, mode)
      return `${value} ${unit}`
    },
  }
}
