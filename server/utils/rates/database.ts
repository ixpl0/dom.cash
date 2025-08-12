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
