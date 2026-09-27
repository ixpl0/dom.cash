import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { createError } from 'h3'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { entry, month, plan } from '~~/server/db/schema'
import type { MonthData, YearInfo } from '~~/shared/types/budget'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { chunkArray, getRowsPerInsertStatement } from '~~/server/utils/d1-limits'
import { isUniqueConstraintError } from '~~/server/utils/database-errors'
import { getExchangeRatesForMonth, loadExchangeRates } from '~~/server/services/budget/rates'
import type { ExchangeRatesData } from '~~/server/services/budget/rates'

type EntryRow = Pick<typeof entry.$inferSelect, 'id' | 'monthId' | 'kind' | 'description' | 'amount' | 'currency' | 'date' | 'isOptional'>

type MonthRow = Pick<typeof month.$inferSelect, 'id' | 'year' | 'month'>

const MAX_REQUESTED_YEARS = 50

const groupEntriesByMonthId = (entries: EntryRow[]): Map<string, EntryRow[]> =>
  entries.reduce(
    (entriesByMonthId, entryRow) => entriesByMonthId.set(entryRow.monthId, [...(entriesByMonthId.get(entryRow.monthId) ?? []), entryRow]),
    new Map<string, EntryRow[]>(),
  )

export const toMonthData = (monthRow: MonthRow, entries: EntryRow[], exchangeRatesData: ExchangeRatesData): MonthData => ({
  id: monthRow.id,
  year: monthRow.year,
  month: monthRow.month,
  balanceSources: entries
    .filter(entryRow => entryRow.kind === 'balance')
    .map(entryRow => ({
      id: entryRow.id,
      description: entryRow.description,
      amount: entryRow.amount,
      currency: entryRow.currency,
    })),
  incomeEntries: entries
    .filter(entryRow => entryRow.kind === 'income')
    .map(entryRow => ({
      id: entryRow.id,
      description: entryRow.description,
      amount: entryRow.amount,
      currency: entryRow.currency,
      date: entryRow.date,
    })),
  expenseEntries: entries
    .filter(entryRow => entryRow.kind === 'expense')
    .map(entryRow => ({
      id: entryRow.id,
      description: entryRow.description,
      amount: entryRow.amount,
      currency: entryRow.currency,
      date: entryRow.date,
      isOptional: entryRow.isOptional ?? false,
    })),
  exchangeRates: exchangeRatesData.rates,
  exchangeRatesSource: exchangeRatesData.source,
})

export const loadMonths = async (ownerId: string, years: number[] | 'all', event: H3Event): Promise<MonthData[]> => {
  const db = useDatabase(event)
  const yearFilter: SQL | undefined = years === 'all'
    ? undefined
    : years.length > 0 ? inArray(month.year, years) : sql`1 = 0`
  const monthFilter = and(eq(month.userId, ownerId), yearFilter)

  const monthRows = await db
    .select({ id: month.id, year: month.year, month: month.month })
    .from(month)
    .where(monthFilter)
    .orderBy(desc(month.year), desc(month.month))

  if (monthRows.length === 0) {
    return []
  }

  const entryRows = await db
    .select()
    .from(entry)
    .where(inArray(entry.monthId, db.select({ id: month.id }).from(month).where(monthFilter)))

  const entriesByMonthId = groupEntriesByMonthId(entryRows)
  const getExchangeRates = await loadExchangeRates(monthRows, event)

  return monthRows.map(monthRow => toMonthData(
    monthRow,
    entriesByMonthId.get(monthRow.id) ?? [],
    getExchangeRates(monthRow.year, monthRow.month),
  ))
}

export const parseRequestedYears = (yearsParam: string): number[] => [
  ...new Set(yearsParam.split(',').map(year => parseInt(year, 10)).filter(year => !Number.isNaN(year))),
].slice(0, MAX_REQUESTED_YEARS)

export const getAvailableYears = async (userId: string, event: H3Event): Promise<YearInfo[]> => {
  const db = useDatabase(event)
  const monthsData = await db
    .select({ year: month.year, month: month.month })
    .from(month)
    .where(eq(month.userId, userId))
    .orderBy(desc(month.year), desc(month.month))

  const monthsByYear = monthsData.reduce(
    (yearMonths, monthData) => yearMonths.set(monthData.year, [...(yearMonths.get(monthData.year) ?? []), monthData.month]),
    new Map<number, number[]>(),
  )

  return [...monthsByYear]
    .map(([year, months]) => ({
      year,
      monthCount: months.length,
      months: [...months].sort((a, b) => a - b),
    }))
    .sort((a, b) => b.year - a.year)
}

export const getInitialYearsToLoad = (years: YearInfo[]): number[] => {
  const [latestYear, secondYear] = years

  if (!latestYear) {
    return []
  }

  return latestYear.monthCount < 3 && secondYear
    ? [latestYear.year, secondYear.year]
    : [latestYear.year]
}

export const loadBudgetMonths = async (ownerId: string, yearsParam: string | undefined, event: H3Event): Promise<MonthData[]> => {
  if (yearsParam) {
    return loadMonths(ownerId, parseRequestedYears(yearsParam), event)
  }

  const availableYears = await getAvailableYears(ownerId, event)
  return loadMonths(ownerId, getInitialYearsToLoad(availableYears), event)
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

export const createMonth = async (params: CreateMonthParams, event: H3Event): Promise<MonthData> => {
  const { year, month: monthNumber, copyFromMonthId, targetUserId } = params

  const db = useDatabase(event)
  const existingMonth = await db
    .select({ id: month.id })
    .from(month)
    .where(and(
      eq(month.userId, targetUserId),
      eq(month.year, year),
      eq(month.month, monthNumber),
    ))
    .limit(1)

  if (existingMonth.length > 0) {
    throw createError({
      statusCode: 409,
      message: ERROR_KEYS.MONTH_ALREADY_EXISTS,
    })
  }

  const exchangeRatesData = await getExchangeRatesForMonth(year, monthNumber, event)

  const entriesToCopy = copyFromMonthId
    ? await findBalanceEntriesToCopy(copyFromMonthId, targetUserId, event)
    : []

  const createdMonth: MonthRow = {
    id: crypto.randomUUID(),
    year,
    month: monthNumber,
  }

  const copiedEntries: EntryRow[] = entriesToCopy.map(sourceEntry => ({
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

  try {
    await db.batch([
      db.insert(month).values({ ...createdMonth, userId: targetUserId }),
      ...insertEntryStatements,
    ])
  }
  catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({
        statusCode: 409,
        message: ERROR_KEYS.MONTH_ALREADY_EXISTS,
      })
    }
    throw error
  }

  return toMonthData(createdMonth, copiedEntries, exchangeRatesData)
}

export const deleteMonth = async (monthId: string, event: H3Event): Promise<void> => {
  const db = useDatabase(event)
  const [monthRecord] = await db
    .select()
    .from(month)
    .where(eq(month.id, monthId))
    .limit(1)

  if (!monthRecord) {
    throw new Error('Month not found')
  }

  await db.batch([
    db.delete(entry).where(eq(entry.monthId, monthId)),
    db.delete(month).where(eq(month.id, monthId)),
    db.delete(plan).where(and(
      eq(plan.userId, monthRecord.userId),
      eq(plan.year, monthRecord.year),
      eq(plan.month, monthRecord.month),
    )),
  ])
}
