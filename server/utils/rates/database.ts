import { currency } from '~~/server/db/schema'
import { useDatabase } from '~~/server/db'
import type { H3Event } from 'h3'
import { fetchHistoricalRates } from './api'

const saveCurrencyRates = async (date: string, rates: Record<string, number>, event: H3Event): Promise<void> => {
  if (!rates || typeof rates !== 'object' || Object.keys(rates).length === 0) {
    throw new Error(`Invalid rates data: empty or invalid object`)
  }
  for (const [currency, rate] of Object.entries(rates)) {
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Invalid rate for currency ${currency}: ${rate}`)
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`)
  }
  const jsonSize = JSON.stringify(rates).length
  if (jsonSize > 50000) {
    throw new Error(`Rates data too large: ${jsonSize} bytes`)
  }

  try {
    const db = useDatabase(event)
    await db.insert(currency)
      .values({ date, rates })
      .onConflictDoUpdate({
        target: currency.date,
        set: { rates },
      })
  }
  catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to save currency rates for ${date}: ${error.message}`, { cause: error })
    }
    throw error
  }
}

export const saveHistoricalRatesForCurrentMonth = async (event: H3Event): Promise<void> => {
  const now = new Date()
  const lastDayOfPreviousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const firstDayOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const lastDayString = lastDayOfPreviousMonth.toISOString().slice(0, 10)
  const firstDayString = firstDayOfCurrentMonth.toISOString().slice(0, 10)

  const rates = await fetchHistoricalRates(lastDayString)
  await saveCurrencyRates(firstDayString, rates, event)
}
