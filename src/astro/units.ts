export type UnitMode = "ly" | "pc" | "mau"

export const LY_PER_PC = 3.261563777
export const MEGA_AU_PER_LY = 0.063241077

// Unit labels and names are locale text: see `units` in src/i18n/messages/.
interface UnitDefinition {
  fromLy: (ly: number) => number
  digits: (value: number) => number
}

const distanceDigits = (value: number): number => (value < 10 ? 2 : value < 100 ? 1 : 0)

const UNITS: Record<UnitMode, UnitDefinition> = {
  ly: { fromLy: (ly) => ly, digits: distanceDigits },
  pc: { fromLy: (ly) => ly / LY_PER_PC, digits: distanceDigits },
  mau: {
    fromLy: (ly) => ly * MEGA_AU_PER_LY,
    digits: (value) => (value === 0 ? 0 : value < 1 ? 3 : 2),
  },
}

const UNIT_ORDER: UnitMode[] = ["ly", "pc", "mau"]

export function nextUnitMode(mode: UnitMode): UnitMode {
  return UNIT_ORDER[(UNIT_ORDER.indexOf(mode) + 1) % UNIT_ORDER.length]
}

/** Distance in `mode` with the number of fraction digits to show. */
export function convertDistance(ly: number, mode: UnitMode): { value: number; digits: number } {
  const unit = UNITS[mode]
  const value = unit.fromLy(ly)
  return { value, digits: unit.digits(value) }
}

export function formatAxisValue(ly: number, mode: UnitMode): string {
  const value = UNITS[mode].fromLy(ly)
  const digits = mode === "mau" ? 2 : Math.abs(value) < 10 ? 1 : 0
  return value.toFixed(digits).replace(/\.0$/, "")
}
