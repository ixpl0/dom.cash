export const PLAIN_DATE_LENGTH = 'YYYY-MM-DD'.length

export const PLAIN_MONTH_LENGTH = 'YYYY-MM'.length

const MS_PER_DAY = 24 * 60 * 60 * 1000

const DAYS_PER_WEEK = 7

export const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getPlainDate = (value: string): string => value.slice(0, PLAIN_DATE_LENGTH)

export const getDaysBetweenPlainDates = (fromDate: string, toDate: string): number =>
  Math.round((Date.parse(getPlainDate(toDate)) - Date.parse(getPlainDate(fromDate))) / MS_PER_DAY)

export const getWeekStartPlainDate = (value: string): string => {
  const date = new Date(`${getPlainDate(value)}T00:00:00Z`)
  const daysSinceMonday = (date.getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK
  return new Date(date.getTime() - daysSinceMonday * MS_PER_DAY).toISOString().slice(0, PLAIN_DATE_LENGTH)
}

export const getPlainDateYear = (value: string): number =>
  new Date(getPlainDate(value)).getUTCFullYear()

export const formatPlainDate = (
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): string =>
  new Date(getPlainDate(value)).toLocaleDateString(locale, { ...options, timeZone: 'UTC' })
