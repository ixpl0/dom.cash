import { and, desc, eq, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { budgetShare, currency, entry, month, user } from '~~/server/db/schema'
import type { MonthData } from '~~/shared/types/budget'

const ratesCache = new Map<string, { rates: Record<string, number>, source: string }>()

export const clearRatesCache = () => {
  ratesCache.clear()
}

const canAttemptUpdate = async (year: number, monthNumber: number, event: H3Event): Promise<boolean> => {
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth()
  const currentHour = now.getUTCHours()
  const currentMinute = now.getUTCMinutes()

  const isCurrentMonth = year === currentYear && monthNumber === currentMonth
  const isAfter0005UTC = currentHour > 0 || (currentHour === 0 && currentMinute >= 5)

  if (!isCurrentMonth || !isAfter0005UTC) {
    return false
  }

  const rateDate = `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`
  const db = useDatabase(event)

  const currencyRecord = await db
    .select({ lastUpdateAttempt: currency.lastUpdateAttempt })
    .from(currency)
    .where(eq(currency.date, rateDate))
    .limit(1)

  if (currencyRecord.length === 0) {
    return true
  }

  const lastAttempt = currencyRecord[0]?.lastUpdateAttempt
  if (!lastAttempt) {
    return true
  }

  const oneHourInMs = 60 * 60 * 1000

  return Date.now() - lastAttempt.getTime() >= oneHourInMs
}

const markUpdateAttempt = async (year: number, monthNumber: number, event: H3Event): Promise<void> => {
  const rateDate = `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`
  const db = useDatabase(event)

  await db
    .insert(currency)
    .values({
      date: rateDate,
      rates: {},
      lastUpdateAttempt: new Date(),
    })
    .onConflictDoUpdate({
      target: currency.date,
      set: {
        lastUpdateAttempt: new Date(),
      },
    })
}

export const getExchangeRatesForMonth = async (year: number, monthNumber: number, event: H3Event): Promise<{ rates: Record<string, number>, source: string }> => {
  const rateDate = `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`

  if (ratesCache.has(rateDate)) {
    return ratesCache.get(rateDate)!
  }

  const db = useDatabase(event)
  const currencyData = await db
    .select()
    .from(currency)
    .where(eq(currency.date, rateDate))
    .limit(1)

  if (currencyData.length > 0) {
    const rates = currencyData[0]?.rates
    if (rates) {
      const result = { rates, source: rateDate }
      ratesCache.set(rateDate, result)
      return result
    }
  }

  const shouldUpdate = await canAttemptUpdate(year, monthNumber, event)
  if (shouldUpdate) {
    await markUpdateAttempt(year, monthNumber, event)

    try {
      const { saveHistoricalRatesForCurrentMonth } = await import('~~/server/utils/rates/database')
      await saveHistoricalRatesForCurrentMonth(event)

      const updatedCurrencyData = await db
        .select()
        .from(currency)
        .where(eq(currency.date, rateDate))
        .limit(1)

      if (updatedCurrencyData.length > 0) {
        const rates = updatedCurrencyData[0]?.rates
        if (rates && Object.keys(rates).length > 0) {
          const result = { rates, source: rateDate }
          ratesCache.set(rateDate, result)
          return result
        }
      }
    }
    catch (error) {
      console.error(`Failed to auto-update currency rates for ${rateDate}:`, error)
    }
  }

  const allCurrencyData = await db
    .select()
    .from(currency)
    .orderBy(currency.date)

  let closestData = allCurrencyData[0]
  if (!closestData) {
    throw new Error(`No exchange rates available in database for ${rateDate}`)
  }

  const targetDate = new Date(rateDate)
  let minDiff = Math.abs(new Date(closestData.date).getTime() - targetDate.getTime())

  for (const data of allCurrencyData) {
    const diff = Math.abs(new Date(data.date).getTime() - targetDate.getTime())
    if (diff < minDiff) {
      minDiff = diff
      closestData = data
    }
  }

  if (closestData?.rates && Object.keys(closestData.rates).length > 0) {
    return { rates: closestData.rates, source: closestData.date }
  }

  throw new Error(`No exchange rates available for ${rateDate} or any fallback date`)
}

export const getUserMonths = async (userId: string, event: H3Event): Promise<MonthData[]> => {
  const db = useDatabase(event)
  const monthsData = await db
    .select()
    .from(month)
    .where(eq(month.userId, userId))
    .orderBy(desc(month.year), desc(month.month))

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
          isOptional: e.isOptional || false,
        }))

      const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0)

      const exchangeRatesData = await getExchangeRatesForMonth(monthData.year, monthData.month, event)

      return {
        id: monthData.id,
        year: monthData.year,
        month: monthData.month,
        userMonthId: monthData.id,
        balanceSources,
        incomeEntries,
        expenseEntries,
        balanceChange: 0,
        pocketExpenses: 0,
        income: totalIncome,
        exchangeRates: exchangeRatesData.rates,
        exchangeRatesSource: exchangeRatesData.source,
      }
    }),
  )
}

export interface CreateMonthParams {
  year: number
  month: number
  copyFromMonthId?: string
  targetUserId: string
}

export const copyBalanceEntriesFromMonth = async (sourceMonthId: string, targetMonthId: string, event: H3Event): Promise<void> => {
  const db = useDatabase(event)

  const balanceEntriesToCopy = await db
    .select()
    .from(entry)
    .where(and(
      eq(entry.monthId, sourceMonthId),
      eq(entry.kind, 'balance'),
    ))

  if (balanceEntriesToCopy.length > 0) {
    const copiedEntries = balanceEntriesToCopy.map(sourceEntry => ({
      id: crypto.randomUUID(),
      monthId: targetMonthId,
      kind: sourceEntry.kind,
      description: sourceEntry.description,
      amount: sourceEntry.amount,
      currency: sourceEntry.currency,
      date: sourceEntry.date,
      isOptional: sourceEntry.isOptional,
    }))

    await db.insert(entry).values(copiedEntries)
  }
}

const buildMonthData = async (monthRecord: typeof month.$inferSelect, event: H3Event): Promise<MonthData> => {
  const db = useDatabase(event)
  const entries = await db
    .select()
    .from(entry)
    .where(eq(entry.monthId, monthRecord.id))

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

  const exchangeRatesData = await getExchangeRatesForMonth(monthRecord.year, monthRecord.month, event)

  return {
    id: monthRecord.id,
    year: monthRecord.year,
    month: monthRecord.month,
    userMonthId: monthRecord.id,
    balanceSources,
    incomeEntries,
    expenseEntries,
    balanceChange: 0,
    pocketExpenses: 0,
    income: totalIncome,
    exchangeRates: exchangeRatesData.rates,
    exchangeRatesSource: exchangeRatesData.source,
  }
}

export const createMonth = async (params: CreateMonthParams, event: H3Event): Promise<MonthData> => {
  const { year, month: monthNumber, copyFromMonthId, targetUserId } = params

  const db = useDatabase(event)
  const existingMonth = await db
    .select()
    .from(month)
    .where(and(
      eq(month.userId, targetUserId),
      eq(month.year, year),
      eq(month.month, monthNumber),
    ))
    .limit(1)

  if (existingMonth.length > 0) {
    throw new Error('Month already exists')
  }

  const [createdMonth] = await db
    .insert(month)
    .values({
      id: crypto.randomUUID(),
      userId: targetUserId,
      year,
      month: monthNumber,
    })
    .returning()

  if (!createdMonth) {
    throw new Error('Failed to create month')
  }

  if (copyFromMonthId) {
    await copyBalanceEntriesFromMonth(copyFromMonthId, createdMonth.id, event)
  }

  return await buildMonthData(createdMonth, event)
}

export const findUserByUsername = async (username: string, event: H3Event) => {
  const db = useDatabase(event)
  const users = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  return users[0] || null
}

export const checkWritePermission = async (ownerId: string, requesterId: string, event: H3Event): Promise<boolean> => {
  if (ownerId === requesterId) {
    return true
  }

  const db = useDatabase(event)
  const shareRecord = await db
    .select({ access: budgetShare.access })
    .from(budgetShare)
    .where(and(
      eq(budgetShare.ownerId, ownerId),
      eq(budgetShare.sharedWithId, requesterId),
    ))
    .limit(1)

  return shareRecord.length > 0 && shareRecord[0]?.access === 'write'
}

export const deleteMonth = async (monthId: string, event: H3Event): Promise<void> => {
  const db = useDatabase(event)
  const monthToDelete = await db
    .select()
    .from(month)
    .where(eq(month.id, monthId))
    .limit(1)

  if (monthToDelete.length === 0) {
    throw new Error('Month not found')
  }

  const { executeBatch } = await import('~~/server/utils/d1-batch')

  await executeBatch(event, [
    { sql: 'DELETE FROM entry WHERE month_id = ?', params: [monthId] },
    { sql: 'DELETE FROM month WHERE id = ?', params: [monthId] },
  ])
}

export interface YearInfo {
  year: number
  monthCount: number
  months: number[]
}

export const getAvailableYears = async (userId: string, event: H3Event): Promise<YearInfo[]> => {
  const db = useDatabase(event)
  const monthsData = await db
    .select({ year: month.year, month: month.month })
    .from(month)
    .where(eq(month.userId, userId))
    .orderBy(desc(month.year), desc(month.month))

  const yearMap = new Map<number, number[]>()

  for (const monthData of monthsData) {
    const months = yearMap.get(monthData.year) || []
    months.push(monthData.month)
    yearMap.set(monthData.year, months)
  }

  return Array.from(yearMap.entries())
    .map(([year, months]) => ({
      year,
      monthCount: months.length,
      months: months.sort((a, b) => a - b),
    }))
    .sort((a, b) => b.year - a.year)
}

export const getInitialYearsToLoad = (years: YearInfo[]): number[] => {
  if (years.length === 0) {
    return []
  }

  const latestYear = years[0]
  if (!latestYear) {
    return []
  }

  const result = [latestYear.year]

  if (latestYear.monthCount < 3 && years.length > 1) {
    const secondYear = years[1]
    if (secondYear) {
      result.push(secondYear.year)
    }
  }

  return result
}

export const getUserMonthsByYears = async (userId: string, years: number[], event: H3Event): Promise<MonthData[]> => {
  const db = useDatabase(event)
  const monthsData = await db
    .select()
    .from(month)
    .where(and(
      eq(month.userId, userId),
      years.length > 0 ? sql`${month.year} IN (${sql.join(years.map(year => sql`${year}`), sql`, `)})` : sql`1 = 0`,
    ))
    .orderBy(desc(month.year), desc(month.month))

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
          isOptional: e.isOptional || false,
        }))

      const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0)

      const exchangeRatesData = await getExchangeRatesForMonth(monthData.year, monthData.month, event)

      return {
        id: monthData.id,
        year: monthData.year,
        month: monthData.month,
        userMonthId: monthData.id,
        balanceSources,
        incomeEntries,
        expenseEntries,
        balanceChange: 0,
        pocketExpenses: 0,
        income: totalIncome,
        exchangeRates: exchangeRatesData.rates,
        exchangeRatesSource: exchangeRatesData.source,
      }
    }),
  )
}
