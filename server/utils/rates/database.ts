import { currency } from '~~/server/db/schema'
import { db } from '~~/server/db'
import { eq } from 'drizzle-orm'

export const saveCurrencyRates = async (date: string, rates: Record<string, number>): Promise<void> => {
  await db.insert(currency)
    .values({ date, rates })
    .onConflictDoUpdate({
      target: currency.date,
      set: { rates },
    })
}

export const getCurrencyRates = async (date: string): Promise<Record<string, number> | null> => {
  const result = await db.select()
    .from(currency)
    .where(eq(currency.date, date))
    .limit(1)

  return result[0]?.rates ?? null
}

export const hasCurrencyRates = async (date: string): Promise<boolean> => {
  const rates = await getCurrencyRates(date)
  return rates !== null
}

export const hasRatesForCurrentMonth = async (): Promise<boolean> => {
  const now = new Date()
  const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const dateString = firstDayOfMonth.toISOString().slice(0, 10)
  return hasCurrencyRates(dateString)
}

export const saveHistoricalRatesForCurrentMonth = async (): Promise<void> => {
  const now = new Date()
  const lastDayOfPreviousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const firstDayOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const lastDayString = lastDayOfPreviousMonth.toISOString().slice(0, 10)
  const firstDayString = firstDayOfCurrentMonth.toISOString().slice(0, 10)

  const { fetchHistoricalRates } = await import('./api')
  const rates = await fetchHistoricalRates(lastDayString)
  await saveCurrencyRates(firstDayString, rates)
}
