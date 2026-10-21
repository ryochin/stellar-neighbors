/** Folds case, width and diacritics so "bootis" finds "Boötis" and "ｓｉｒｉｕｓ" finds "Sirius". */
export const normalizeSearchText = (text: string): string =>
  text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim()
