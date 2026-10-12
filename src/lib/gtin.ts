/** Pad 13-digit EAN to GTIN-14 (Национальный каталог uses 14 digits). */
export function normalizeGtin(value: string): string {
  const v = value.trim()
  return /^\d{13}$/.test(v) ? `0${v}` : v
}

/** GS1 mod-10 check of a 14-digit GTIN. */
export function isValidGtin(gtin: string): boolean {
  if (!/^\d{14}$/.test(gtin)) return false
  const digits = gtin.split('').map(Number)
  const sum = digits
    .slice(0, 13)
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === digits[13]
}
