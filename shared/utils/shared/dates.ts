const PLAIN_DATE_LENGTH = 'YYYY-MM-DD'.length

export const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getPlainDateYear = (value: string): number =>
  new Date(value.slice(0, PLAIN_DATE_LENGTH)).getUTCFullYear()

export const formatPlainDate = (
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): string =>
  new Date(value.slice(0, PLAIN_DATE_LENGTH)).toLocaleDateString(locale, { ...options, timeZone: 'UTC' })
