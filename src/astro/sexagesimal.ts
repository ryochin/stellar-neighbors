const pad2 = (value: number): string => String(value).padStart(2, "0")

/** Splits hours or degrees into whole units, minutes and seconds, rounded to the second. */
function splitSexagesimal(value: number): [number, number, number] {
  const total = Math.round(value * 3600)
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
}

/** Right ascension as in star charts: "6h 45m 09s". */
export function formatRightAscension(raH: number): string {
  const [h, m, s] = splitSexagesimal(raH)
  return `${h % 24}h ${pad2(m)}m ${pad2(s)}s`
}

/** Declination with an explicit sign, like the galactic latitude: "-16° 42′ 58″". */
export function formatDeclination(decDeg: number): string {
  const [d, m, s] = splitSexagesimal(Math.abs(decDeg))
  return `${decDeg < 0 ? "-" : "+"}${d}° ${pad2(m)}′ ${pad2(s)}″`
}
