export const formatPrice = (price: number) => `${price.toLocaleString('ru-RU')} ₽`

export const formatPeriod = (months: number) => {
  const mod10 = months % 10
  const mod100 = months % 100
  if (mod10 === 1 && mod100 !== 11) return `${months} месяц`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${months} месяца`
  return `${months} месяцев`
}
