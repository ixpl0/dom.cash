import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { createError } from 'h3'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { currency, entry, month, user } from '~~/server/db/schema'
import type { MonthData, YearInfo } from '~~/shared/types/budget'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { isValidRates } from '~~/server/utils/rates/validation'
import { chunkArray, getRowsPerInsertStatement } from '~~/server/utils/d1-limits'

const groupEntriesByMonthId = (entries: (typeof entry.$inferSelect)[]): Map<string, (typeof entry.$inferSelect)[]> => {
  const map = new Map<string, (typeof entry.$inferSelect)[]>()
  for (const e of entries) {
    const list = map.get(e.monthId) || []
    map.set(e.monthId, [...list, e])
  }
  return map
}

const canAttemptUpdate = (year: number, monthNumber: number, lastAttempt: Date | null | undefined): boolean => {
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

  const db = useDatabase(event)
  const currencyData = await db
    .select()
    .from(currency)
    .where(eq(currency.date, rateDate))
    .limit(1)

  const currentRates = currencyData[0]?.rates
  if (isValidRates(currentRates)) {
    return { rates: currentRates, source: rateDate }
  }

  const shouldUpdate = canAttemptUpdate(year, monthNumber, currencyData[0]?.lastUpdateAttempt)
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

      const updatedRates = updatedCurrencyData[0]?.rates
      if (isValidRates(updatedRates)) {
        return { rates: updatedRates, source: rateDate }
      }
    }
    catch (error) {
      console.error(`Failed to auto-update currency rates for ${rateDate}:`, error)
    }
  }

  const validStoredRates = sql`json_type(${currency.rates}) = 'object'
    AND EXISTS (SELECT 1 FROM json_each(${currency.rates}))
    AND NOT EXISTS (
      SELECT 1 FROM json_each(${currency.rates})
      WHERE type NOT IN ('integer', 'real') OR value <= 0
    )`

  const [beforeOrEqual, afterOrEqual] = await Promise.all([
    db
      .select()
      .from(currency)
      .where(and(sql`${currency.date} <= ${rateDate}`, validStoredRates))
      .orderBy(desc(currency.date))
      .limit(1),
    db
      .select()
      .from(currency)
      .where(and(sql`${currency.date} >= ${rateDate}`, validStoredRates))
      .orderBy(currency.date)
      .limit(1),
  ])

  const candidates = [...beforeOrEqual, ...afterOrEqual].filter(
    candidate => isValidRates(candidate.rates),
  )

  if (candidates.length === 0) {
    throw createError({
      statusCode: 503,
      message: ERROR_KEYS.FAILED_TO_UPDATE_RATES,
    })
  }

  const targetDate = new Date(rateDate)
  const closestData = candidates.reduce((closest, current) => {
    const closestDiff = Math.abs(new Date(closest.date).getTime() - targetDate.getTime())
    const currentDiff = Math.abs(new Date(current.date).getTime() - targetDate.getTime())
    return currentDiff < closestDiff ? current : closest
  })

  return { rates: closestData.rates, source: closestData.date }
}

export const getUserMonths = async (userId: string, event: H3Event): Promise<MonthData[]> => {
  const db = useDatabase(event)
  const monthsData = await db
    .select()
    .from(month)
    .where(eq(month.userId, userId))
    .orderBy(desc(month.year), desc(month.month))

  if (monthsData.length === 0) {
    return []
  }

  const monthIds = monthsData.map(m => m.id)
  const allEntries = await db
    .select()
    .from(entry)
    .where(inArray(entry.monthId, monthIds))

  const entriesByMonthId = groupEntriesByMonthId(allEntries)

  return await Promise.all(
    monthsData.map(async (monthData) => {
      const entries = entriesByMonthId.get(monthData.id) || []

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

const findBalanceEntriesToCopy = async (sourceMonthId: string, ownerId: string, event: H3Event) => {
  const db = useDatabase(event)
  const [sourceMonth] = await db
    .select({ id: month.id })
    .from(month)
    .where(and(
      eq(month.id, sourceMonthId),
      eq(month.userId, ownerId),
    ))
    .limit(1)

  if (!sourceMonth) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.MONTH_NOT_FOUND,
    })
  }

  return db
    .select()
    .from(entry)
    .where(and(
      eq(entry.monthId, sourceMonth.id),
      eq(entry.kind, 'balance'),
    ))
}

const buildMonthData = async (
  monthRecord: Pick<typeof month.$inferSelect, 'id' | 'year' | 'month'>,
  exchangeRatesData: Awaited<ReturnType<typeof getExchangeRatesForMonth>>,
  event: H3Event,
): Promise<MonthData> => {
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

  const exchangeRatesData = await getExchangeRatesForMonth(year, monthNumber, event)

  const entriesToCopy = copyFromMonthId
    ? await findBalanceEntriesToCopy(copyFromMonthId, targetUserId, event)
    : []

  const createdMonth = {
    id: crypto.randomUUID(),
    year,
    month: monthNumber,
  }

  const copiedEntries = entriesToCopy.map(sourceEntry => ({
    id: crypto.randomUUID(),
    monthId: createdMonth.id,
    kind: sourceEntry.kind,
    description: sourceEntry.description,
    amount: sourceEntry.amount,
    currency: sourceEntry.currency,
    date: sourceEntry.date,
    isOptional: sourceEntry.isOptional,
  }))

  const insertEntryStatements = chunkArray(copiedEntries, getRowsPerInsertStatement(entry))
    .map(entryChunk => db.insert(entry).values(entryChunk))

  await db.batch([
    db.insert(month).values({ ...createdMonth, userId: targetUserId }),
    ...insertEntryStatements,
  ])

  return await buildMonthData(createdMonth, exchangeRatesData, event)
}

export const findUserByUsername = async (username: string, event: H3Event): Promise<typeof user.$inferSelect | null> => {
  const db = useDatabase(event)
  const users = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  return users[0] ?? null
}

export const deleteMonth = async (monthId: string, event: H3Event): Promise<void> => {
  const db = useDatabase(event)
  const monthToDelete = await db
    .select()
    .from(month)
    .where(eq(month.id, monthId))
    .limit(1)

  const monthRecord = monthToDelete[0]
  if (!monthRecord) {
    throw new Error('Month not found')
  }

  const { executeBatch } = await import('~~/server/utils/d1-batch')

  await executeBatch(event, [
    { sql: 'DELETE FROM entry WHERE month_id = ?', params: [monthId] },
    { sql: 'DELETE FROM month WHERE id = ?', params: [monthId] },
    {
      sql: 'DELETE FROM plan WHERE user_id = ? AND year = ? AND month = ?',
      params: [monthRecord.userId, monthRecord.year, monthRecord.month],
    },
  ])
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

  if (monthsData.length === 0) {
    return []
  }

  const monthIds = monthsData.map(m => m.id)
  const allEntries = await db
    .select()
    .from(entry)
    .where(inArray(entry.monthId, monthIds))

  const entriesByMonthId = groupEntriesByMonthId(allEntries)

  return await Promise.all(
    monthsData.map(async (monthData) => {
      const entries = entriesByMonthId.get(monthData.id) || []

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
