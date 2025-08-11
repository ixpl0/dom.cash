import { desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { entry, month, currency } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'

const ratesCache = new Map<string, Record<string, number>>()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const monthsData = await db
    .select()
    .from(month)
    .where(eq(month.userId, user.id))
    .orderBy(desc(month.year), desc(month.month))

  const getExchangeRatesForMonth = async (year: number, month: number): Promise<{ rates: Record<string, number>, source: string } | undefined> => {
    const rateDate = `${year}-${String(month + 1).padStart(2, '0')}-01`

    if (ratesCache.has(rateDate)) {
      return { rates: ratesCache.get(rateDate)!, source: rateDate }
    }

    const currencyData = await db
      .select()
      .from(currency)
      .where(eq(currency.date, rateDate))
      .limit(1)

    if (currencyData.length > 0) {
      const rates = currencyData[0]?.rates
      if (rates) {
        ratesCache.set(rateDate, rates)
        return { rates, source: rateDate }
      }
    }

    const allCurrencyData = await db
      .select()
      .from(currency)
      .orderBy(currency.date)

    if (allCurrencyData.length === 0) {
      return undefined
    }

    const targetDate = new Date(rateDate)
    let closestData = allCurrencyData[0]
    let minDiff = Math.abs(new Date(allCurrencyData[0]!.date).getTime() - targetDate.getTime())

    for (const data of allCurrencyData) {
      const diff = Math.abs(new Date(data.date).getTime() - targetDate.getTime())
      if (diff < minDiff) {
        minDiff = diff
        closestData = data
      }
    }

    if (closestData?.rates) {
      ratesCache.set(rateDate, closestData.rates)
      return { rates: closestData.rates, source: closestData.date }
    }

    return undefined
  }

  return await Promise.all(
    monthsData.map(async (monthData) => {
      const entries = await db
        .select()
        .from(entry)
        .where(eq(entry.monthId, monthData.id))

      const balanceSources = entries
        .filter(e => e.kind === 'balance')
        .map(e => ({
          id: e.id,
          description: e.description,
          currency: e.currency,
          amount: e.amount,
        }))

      const incomeEntries = entries
        .filter(e => e.kind === 'income')
        .map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          currency: e.currency,
          date: e.date,
        }))

      const expenseEntries = entries
        .filter(e => e.kind === 'expense')
        .map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          currency: e.currency,
          date: e.date,
        }))

      const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0)
      const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0)
      const balanceChange = totalIncome - totalExpenses

      const exchangeRatesData = await getExchangeRatesForMonth(monthData.year, monthData.month)

      return {
        id: monthData.id,
        year: monthData.year,
        month: monthData.month,
        userMonthId: monthData.id,
        balanceSources,
        incomeEntries,
        expenseEntries,
        balanceChange,
        pocketExpenses: 0,
        income: totalIncome,
        exchangeRates: exchangeRatesData?.rates,
        exchangeRatesSource: exchangeRatesData?.source,
      }
    }),
  )
})
