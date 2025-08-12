import { fetchLatestRates, fetchHistoricalRates } from './api'
import { saveCurrencyRates, hasCurrencyRates } from './database'

const formatDateAsYmd = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getLastDayOfPreviousMonth = (date: Date): string => {
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0))
  return formatDateAsYmd(lastDay)
}

const isFirstDayOfMonth = (date: Date): boolean => {
  return date.getUTCDate() === 1
}

const shouldAttemptHistoricalFetch = (date: Date): boolean => {
  const dayOfMonth = date.getUTCDate()
  return [2, 3, 8, 15].includes(dayOfMonth)
}

export const updateCurrentRates = async (): Promise<void> => {
  const rates = await fetchLatestRates()
  const today = formatDateAsYmd(new Date())
  await saveCurrencyRates(today, rates)
}

export const updateHistoricalRatesForCurrentMonth = async (): Promise<void> => {
  const today = new Date()
  const targetDate = getLastDayOfPreviousMonth(today)

  if (await hasCurrencyRates(targetDate)) {
    return
  }

  const rates = await fetchHistoricalRates(targetDate)
  await saveCurrencyRates(targetDate, rates)
}

export const shouldUpdateRatesNow = (now: Date): { updateCurrent: boolean, updateHistorical: boolean } => {
  return {
    updateCurrent: isFirstDayOfMonth(now),
    updateHistorical: shouldAttemptHistoricalFetch(now),
  }
}
