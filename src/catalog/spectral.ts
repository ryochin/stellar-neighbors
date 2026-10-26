/**
 * The class letter of a spectral type, for the star color: "A0mA1Va" → "A".
 * Uppercase D marks a white dwarf; HYG's older lowercase "d" prefix (dM5.5e) means a dwarf.
 */
export function spectralClass(spectralType: string): string {
  if (spectralType.startsWith("D")) return "D"
  return spectralType.toUpperCase().match(/[OBAFGKM]/)?.[0] ?? ""
}
