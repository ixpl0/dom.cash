import type { MonthData } from '~~/shared/types/budget'

export interface MonthPosition {
  year: number
  month: number
}

const toMonthNumber = ({ year, month }: MonthPosition): number => year * 12 + month

export const sortMonthsNewestFirst = <T extends MonthPosition>(months: readonly T[]): T[] =>
  [...months].sort((a, b) => toMonthNumber(b) - toMonthNumber(a))

export const getCurrentMonth = (): MonthPosition => {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

const fromMonthNumber = (monthNumber: number): MonthPosition => ({
  year: Math.floor(monthNumber / 12),
  month: monthNumber % 12,
})

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

export const isFirstMonth = (monthData: MonthData, allMonths: MonthData[]): boolean =>
  sortMonthsNewestFirst(allMonths).at(-1)?.id === monthData.id

export const isLastMonth = (monthData: MonthData, allMonths: MonthData[]): boolean =>
  sortMonthsNewestFirst(allMonths)[0]?.id === monthData.id

export const isCurrentMonth = (monthData: MonthPosition, currentMonth: MonthPosition = getCurrentMonth()): boolean =>
  monthData.year === currentMonth.year && monthData.month === currentMonth.month

export const isPastMonth = (year: number, month: number, currentMonth: MonthPosition = getCurrentMonth()): boolean =>
  toMonthNumber({ year, month }) < toMonthNumber(currentMonth)
