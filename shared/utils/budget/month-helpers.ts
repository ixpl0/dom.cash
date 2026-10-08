import type { MonthData } from '~~/shared/types/budget'

export interface MonthPosition {
  year: number
  month: number
}

export const toMonthNumber = ({ year, month }: MonthPosition): number => year * 12 + month

export const sortMonthsNewestFirst = <T extends MonthPosition>(months: readonly T[]): T[] =>
  [...months].sort((a, b) => toMonthNumber(b) - toMonthNumber(a))

export const getCurrentMonth = (): MonthPosition => {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

export const fromMonthNumber = (monthNumber: number): MonthPosition => ({
  year: Math.floor(monthNumber / 12),
  month: monthNumber % 12,
})

export const getFollowingMonth = (monthData: MonthPosition): MonthPosition =>
  fromMonthNumber(toMonthNumber(monthData) + 1)

export const getMonthStartDate = ({ year, month }: MonthPosition): string =>
  `${year}-${String(month + 1).padStart(2, '0')}-01`

export const getNextMonth = (currentMonths: MonthData[]): MonthPosition => {
  const [latest] = sortMonthsNewestFirst(currentMonths)
  return latest ? fromMonthNumber(toMonthNumber(latest) + 1) : getCurrentMonth()
}

export const getPreviousMonth = (currentMonths: MonthData[]): MonthPosition => {
  const earliest = sortMonthsNewestFirst(currentMonths).at(-1)
  return earliest ? fromMonthNumber(toMonthNumber(earliest) - 1) : getCurrentMonth()
}

export const findClosestMonthForCopy = (
  monthsData: MonthData[],
  targetYear: number,
  targetMonth: number,
  direction: 'next' | 'previous',
): string | undefined => {
  const target = toMonthNumber({ year: targetYear, month: targetMonth })
  const sortedMonths = sortMonthsNewestFirst(monthsData)
  const closestMonth = direction === 'next'
    ? sortedMonths.filter(month => toMonthNumber(month) > target).at(-1)
    : sortedMonths.find(month => toMonthNumber(month) < target)

  return closestMonth?.id
}

export interface MonthBounds<T> {
  earliest: T | null
  latest: T | null
}

export const findMonthBounds = <T extends MonthPosition>(months: readonly T[]): MonthBounds<T> => {
  const sortedMonths = sortMonthsNewestFirst(months)
  return { earliest: sortedMonths.at(-1) ?? null, latest: sortedMonths[0] ?? null }
}

export const isCurrentMonth = (monthData: MonthPosition, currentMonth: MonthPosition = getCurrentMonth()): boolean =>
  monthData.year === currentMonth.year && monthData.month === currentMonth.month

export const isPastMonth = (year: number, month: number, currentMonth: MonthPosition = getCurrentMonth()): boolean =>
  toMonthNumber({ year, month }) < toMonthNumber(currentMonth)

const START_BALANCE_GRACE_DAYS = 3

export const isLateToEditStartBalance = (monthData: MonthPosition, now: Date = new Date()): boolean =>
  isCurrentMonth(monthData, { year: now.getFullYear(), month: now.getMonth() })
  && now.getDate() > START_BALANCE_GRACE_DAYS

const LATEST_TIME_ZONE_UTC_OFFSET_HOURS = 12

export const hasMonthEndedEverywhere = (year: number, month: number, now: Date = new Date()): boolean =>
  now.getTime() >= Date.UTC(year, month + 1, 1, LATEST_TIME_ZONE_UTC_OFFSET_HOURS)
