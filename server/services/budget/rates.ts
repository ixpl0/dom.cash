import { and, asc, between, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { createError } from 'h3'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { currency } from '~~/server/db/schema'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { isValidRates } from '~~/server/utils/rates/validation'
import { saveHistoricalRatesForCurrentMonth } from '~~/server/utils/rates/database'
import { secureLog } from '~~/server/utils/secure-logger'

export interface ExchangeRatesData {
  rates: Record<string, number>
  source: string
}

export interface RatesMonth {
  year: number
  month: number
}

type CurrencyRow = typeof currency.$inferSelect

export type ExchangeRatesLookup = (year: number, monthNumber: number) => ExchangeRatesData

const UPDATE_RETRY_INTERVAL_MS = 60 * 60 * 1000

export const toRatesDate = (year: number, monthNumber: number): string =>
  `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`

const getCurrentRatesDate = (now: Date): string => toRatesDate(now.getUTCFullYear(), now.getUTCMonth())

const canAttemptUpdate = (now: Date, lastAttempt: Date | null | undefined): boolean => {
  const isAfter0005UTC = now.getUTCHours() > 0 || now.getUTCMinutes() >= 5

  if (!isAfter0005UTC) {
    return false
  }

  return !lastAttempt || now.getTime() - lastAttempt.getTime() >= UPDATE_RETRY_INTERVAL_MS
}

const hasValidRates = (row: CurrencyRow): boolean => isValidRates(row.rates)

const validStoredRates = sql`json_type(${currency.rates}) = 'object'
  AND EXISTS (SELECT 1 FROM json_each(${currency.rates}))
  AND NOT EXISTS (
    SELECT 1 FROM json_each(${currency.rates})
    WHERE type NOT IN ('integer', 'real') OR value <= 0
  )`

const markUpdateAttempt = async (ratesDate: string, now: Date, event: H3Event): Promise<void> => {
  await useDatabase(event)
    .insert(currency)
    .values({
      date: ratesDate,
      rates: {},
      lastUpdateAttempt: now,
    })
    .onConflictDoUpdate({
      target: currency.date,
      set: {
        lastUpdateAttempt: now,
      },
    })
}

const updateCurrentMonthRates = async (ratesDate: string, now: Date, event: H3Event): Promise<CurrencyRow | null> => {
  await markUpdateAttempt(ratesDate, now, event)

  try {
    await saveHistoricalRatesForCurrentMonth(event)

    const [updatedRow] = await useDatabase(event)
      .select()
      .from(currency)
      .where(eq(currency.date, ratesDate))
      .limit(1)

    return updatedRow && hasValidRates(updatedRow) ? updatedRow : null
  }
  catch (error) {
    secureLog.error(`Failed to auto-update currency rates for ${ratesDate}:`, error)
    return null
  }
}

const loadNeighbourRows = async (firstDate: string, lastDate: string, event: H3Event): Promise<CurrencyRow[]> => {
  const db = useDatabase(event)
  const [before, after] = await Promise.all([
    db
      .select()
      .from(currency)
      .where(and(lte(currency.date, firstDate), validStoredRates))
      .orderBy(desc(currency.date))
      .limit(1),
    db
      .select()
      .from(currency)
      .where(and(gte(currency.date, lastDate), validStoredRates))
      .orderBy(asc(currency.date))
      .limit(1),
  ])

  return [...before, ...after].filter(hasValidRates)
}

const getDistanceInDays = (fromDate: string, toDate: string): number =>
  Math.abs(Date.parse(fromDate) - Date.parse(toDate)) / (24 * 60 * 60 * 1000)

const findClosestRow = (ratesDate: string, rows: CurrencyRow[]): CurrencyRow | undefined =>
  rows.reduce<CurrencyRow | undefined>((closest, row) => {
    if (!closest) {
      return row
    }
    const distance = getDistanceInDays(row.date, ratesDate)
    const closestDistance = getDistanceInDays(closest.date, ratesDate)
    return distance < closestDistance || (distance === closestDistance && row.date < closest.date) ? row : closest
  }, undefined)

export const loadExchangeRates = async (months: readonly RatesMonth[], event: H3Event): Promise<ExchangeRatesLookup> => {
  const ratesDates = [...new Set(months.map(({ year, month }) => toRatesDate(year, month)))].sort()
  const firstDate = ratesDates[0]
  const lastDate = ratesDates.at(-1)
  const ratesByDate = new Map<string, ExchangeRatesData>()

  if (firstDate && lastDate) {
    const now = new Date()
    const currentRatesDate = getCurrentRatesDate(now)
    const storedRows = await useDatabase(event)
      .select()
      .from(currency)
      .where(between(currency.date, firstDate, lastDate))

    const currentRow = storedRows.find(row => row.date === currentRatesDate)
    const shouldUpdateCurrentMonth = ratesDates.includes(currentRatesDate)
      && !(currentRow && hasValidRates(currentRow))
      && canAttemptUpdate(now, currentRow?.lastUpdateAttempt)
    const updatedRow = shouldUpdateCurrentMonth ? await updateCurrentMonthRates(currentRatesDate, now, event) : null

    const validRows = [
      ...storedRows.filter(row => row.date !== updatedRow?.date).filter(hasValidRates),
      ...(updatedRow ? [updatedRow] : []),
    ]
    const validDates = new Set(validRows.map(row => row.date))
    const needsNeighbours = ratesDates.some(ratesDate => !validDates.has(ratesDate))
    const candidateRows = needsNeighbours
      ? [...validRows, ...await loadNeighbourRows(firstDate, lastDate, event)]
      : validRows

    ratesDates.forEach((ratesDate) => {
      const closestRow = findClosestRow(ratesDate, candidateRows)
      if (closestRow) {
        ratesByDate.set(ratesDate, { rates: closestRow.rates, source: closestRow.date })
      }
    })
  }

  return (year, monthNumber) => {
    const exchangeRates = ratesByDate.get(toRatesDate(year, monthNumber))

    if (!exchangeRates) {
      throw createError({
        statusCode: 503,
        message: ERROR_KEYS.FAILED_TO_UPDATE_RATES,
      })
    }

    return exchangeRates
  }
}

export const getExchangeRatesForMonth = async (year: number, monthNumber: number, event: H3Event): Promise<ExchangeRatesData> => {
  const getExchangeRates = await loadExchangeRates([{ year, month: monthNumber }], event)
  return getExchangeRates(year, monthNumber)
}
