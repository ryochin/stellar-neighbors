export type UnitMode = "ly" | "pc" | "mau"

export const LY_PER_PC = 3.261563777
export const MEGA_AU_PER_LY = 0.063241077

interface UnitDefinition {
  label: string
  fromLy: (ly: number) => number
  digits: (value: number) => number
}

const distanceDigits = (value: number): number => (value < 10 ? 2 : value < 100 ? 1 : 0)

export const UNITS: Record<UnitMode, UnitDefinition> = {
  ly: { label: "ly", fromLy: (ly) => ly, digits: distanceDigits },
  pc: { label: "pc", fromLy: (ly) => ly / LY_PER_PC, digits: distanceDigits },
  mau: {
    label: "MAU",
    fromLy: (ly) => ly * MEGA_AU_PER_LY,
    digits: (value) => (value === 0 ? 0 : value < 1 ? 3 : 2),
  },
}

const UNIT_ORDER: UnitMode[] = ["ly", "pc", "mau"]

export function nextUnitMode(mode: UnitMode): UnitMode {
  return UNIT_ORDER[(UNIT_ORDER.indexOf(mode) + 1) % UNIT_ORDER.length]
}

export function formatDistance(ly: number, mode: UnitMode): string {
  const unit = UNITS[mode]
  const value = unit.fromLy(ly)
  return `${value.toFixed(unit.digits(value))} ${unit.label}`
}

export function formatAxisValue(ly: number, mode: UnitMode): string {
  const value = UNITS[mode].fromLy(ly)
  const digits = mode === "mau" ? 2 : Math.abs(value) < 10 ? 1 : 0
  return value.toFixed(digits).replace(/\.0$/, "")
}
