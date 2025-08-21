import { currency } from '~~/server/db/schema'
import { useDatabase } from '~~/server/db'
import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'

export const saveCurrencyRates = async (date: string, rates: Record<string, number>, event: H3Event): Promise<void> => {
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
      throw new Error(`Failed to save currency rates for ${date}: ${error.message}`)
    }
    throw error
  }
}

export const getCurrencyRates = async (date: string, event: H3Event): Promise<Record<string, number> | null> => {
  const db = useDatabase(event)
  const result = await db.select()
    .from(currency)
    .where(eq(currency.date, date))
    .limit(1)

  return result[0]?.rates ?? null
}

export const hasCurrencyRates = async (date: string, event: H3Event): Promise<boolean> => {
  const rates = await getCurrencyRates(date, event)
  return rates !== null
}

export const hasRatesForCurrentMonth = async (event?: H3Event): Promise<boolean> => {
  if (!event) {
    throw new Error('hasRatesForCurrentMonth requires H3Event context')
  }
  const now = new Date()
  const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const dateString = firstDayOfMonth.toISOString().slice(0, 10)
  return hasCurrencyRates(dateString, event)
}

export const saveHistoricalRatesForCurrentMonth = async (event?: H3Event): Promise<void> => {
  if (!event) {
    throw new Error('saveHistoricalRatesForCurrentMonth requires H3Event context')
  }
  const now = new Date()
  const lastDayOfPreviousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const firstDayOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const lastDayString = lastDayOfPreviousMonth.toISOString().slice(0, 10)
  const firstDayString = firstDayOfCurrentMonth.toISOString().slice(0, 10)

  const { fetchHistoricalRates } = await import('./api')
  const rates = await fetchHistoricalRates(lastDayString)
  await saveCurrencyRates(firstDayString, rates, event)
}
