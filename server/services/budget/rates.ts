import { and, desc, eq, sql } from 'drizzle-orm'
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

const markUpdateAttempt = async (rateDate: string, event: H3Event): Promise<void> => {
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

export const toRatesDate = (year: number, monthNumber: number): string =>
  `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`

export const getExchangeRatesForMonth = async (year: number, monthNumber: number, event: H3Event): Promise<ExchangeRatesData> => {
  const rateDate = toRatesDate(year, monthNumber)

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
    await markUpdateAttempt(rateDate, event)

    try {
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
      secureLog.error(`Failed to auto-update currency rates for ${rateDate}:`, error)
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
