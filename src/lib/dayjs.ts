import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import localeData from 'dayjs/plugin/localeData'
import updateLocale from 'dayjs/plugin/updateLocale'

dayjs.extend(localeData)
dayjs.extend(updateLocale)
dayjs.locale('ru')

dayjs.updateLocale('ru', {
  weekStart: 1,
})

export const DATE_FORMAT = 'DD.MM.YYYY'
export const DATETIME_FORMAT = 'DD.MM.YYYY HH:mm'
export const API_DATE_FORMAT = 'YYYY-MM-DD'

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return dayjs(date).format(DATE_FORMAT)
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return dayjs(date).format(DATETIME_FORMAT)
}

export default dayjs
export type { Dayjs } from 'dayjs'
