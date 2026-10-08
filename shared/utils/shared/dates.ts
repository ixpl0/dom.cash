export const PLAIN_DATE_LENGTH = 'YYYY-MM-DD'.length

const MS_PER_DAY = 24 * 60 * 60 * 1000

export const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getPlainDate = (value: string): string => value.slice(0, PLAIN_DATE_LENGTH)

export const getDaysBetweenPlainDates = (fromDate: string, toDate: string): number =>
  Math.round((Date.parse(getPlainDate(toDate)) - Date.parse(getPlainDate(fromDate))) / MS_PER_DAY)

export const getPlainDateYear = (value: string): number =>
  new Date(getPlainDate(value)).getUTCFullYear()

export const formatPlainDate = (
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): string =>
  new Date(getPlainDate(value)).toLocaleDateString(locale, { ...options, timeZone: 'UTC' })
