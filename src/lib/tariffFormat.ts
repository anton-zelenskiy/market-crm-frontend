import type { TariffPeriodType } from '../api/subscriptions'

export const formatPrice = (price: number) => `${price.toLocaleString('ru-RU')} ₽`

const PERIOD_FORMS: Record<TariffPeriodType, [string, string, string]> = {
  day: ['день', 'дня', 'дней'],
  month: ['месяц', 'месяца', 'месяцев'],
}

export const formatPeriod = (period: number, periodType: TariffPeriodType = 'month') => {
  const [one, few, many] = PERIOD_FORMS[periodType]
  const mod10 = period % 10
  const mod100 = period % 100
  if (mod10 === 1 && mod100 !== 11) return `${period} ${one}`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${period} ${few}`
  return `${period} ${many}`
}
