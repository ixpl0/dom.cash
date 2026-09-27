import type {
  DateReference,
  DayOfMonthRecurrence,
  IntervalRecurrence,
  RecurrencePattern,
  WeekdaysRecurrence,
} from '~~/shared/types/recurrence'

const DAYS_IN_WEEK = 7
const MONTHS_IN_YEAR = 12

const getDaysInMonth = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate()

const createDateLike = (baseDate: Date, year: number, monthIndex: number, day: number): Date =>
  new Date(
    year,
    monthIndex,
    day,
    baseDate.getHours(),
    baseDate.getMinutes(),
    baseDate.getSeconds(),
    baseDate.getMilliseconds(),
  )

const addDays = (baseDate: Date, days: number): Date =>
  createDateLike(baseDate, baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + days)

const getDayInMonth = (baseDate: Date, monthOffset: number, day: number): Date => {
  const firstDayOfTargetMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1)
  const year = firstDayOfTargetMonth.getFullYear()
  const monthIndex = firstDayOfTargetMonth.getMonth()
  return createDateLike(baseDate, year, monthIndex, Math.min(day, getDaysInMonth(year, monthIndex)))
}

const calculateIntervalNextDate = (
  baseDate: Date,
  pattern: IntervalRecurrence,
): Date => {
  switch (pattern.unit) {
    case 'day': {
      return addDays(baseDate, pattern.value)
    }
    case 'week': {
      return addDays(baseDate, pattern.value * DAYS_IN_WEEK)
    }
    case 'month': {
      return getDayInMonth(baseDate, pattern.value, baseDate.getDate())
    }
    case 'year': {
      return getDayInMonth(baseDate, pattern.value * MONTHS_IN_YEAR, baseDate.getDate())
    }
  }
}

const getDaysUntilNextWeekday = (currentDay: number, days: readonly number[], isCurrentDayIncluded: boolean): number => {
  const sortedDays = [...days].sort((a, b) => a - b)

  if (isCurrentDayIncluded && sortedDays.includes(currentDay)) {
    return 0
  }

  const nextDay = sortedDays.find(day => day > currentDay)
  if (nextDay !== undefined) {
    return nextDay - currentDay
  }

  return DAYS_IN_WEEK - currentDay + (sortedDays[0] ?? 0)
}

const calculateWeekdaysNextDate = (
  baseDate: Date,
  pattern: WeekdaysRecurrence,
): Date => addDays(baseDate, getDaysUntilNextWeekday(baseDate.getDay(), pattern.days, false))

const calculateDayOfMonthNextDate = (
  baseDate: Date,
  pattern: DayOfMonthRecurrence,
): Date => {
  const dayInCurrentMonth = getDayInMonth(baseDate, 0, pattern.day)
  return dayInCurrentMonth.getTime() > baseDate.getTime()
    ? dayInCurrentMonth
    : getDayInMonth(baseDate, 1, pattern.day)
}

export const calculateNextDate = (
  pattern: RecurrencePattern,
  fromDate: Date,
  reference: DateReference,
): Date => {
  const baseDate = reference === 'now' ? new Date() : new Date(fromDate)

  switch (pattern.type) {
    case 'interval': {
      return calculateIntervalNextDate(baseDate, pattern)
    }
    case 'weekdays': {
      return calculateWeekdaysNextDate(baseDate, pattern)
    }
    case 'dayOfMonth': {
      return calculateDayOfMonthNextDate(baseDate, pattern)
    }
  }
}

export const formatDateForDb = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T00:00`
}

const calculateWeekdaysInitialDate = (
  baseDate: Date,
  pattern: WeekdaysRecurrence,
): Date => addDays(baseDate, getDaysUntilNextWeekday(baseDate.getDay(), pattern.days, true))

const calculateDayOfMonthInitialDate = (
  baseDate: Date,
  pattern: DayOfMonthRecurrence,
): Date => {
  const dayInCurrentMonth = getDayInMonth(baseDate, 0, pattern.day)
  return dayInCurrentMonth.getTime() >= baseDate.getTime()
    ? dayInCurrentMonth
    : getDayInMonth(baseDate, 1, pattern.day)
}

export const calculateInitialDate = (
  pattern: RecurrencePattern,
  fromDate: Date | null,
): Date => {
  const baseDate = fromDate ?? new Date()

  switch (pattern.type) {
    case 'interval': {
      return baseDate
    }
    case 'weekdays': {
      return calculateWeekdaysInitialDate(baseDate, pattern)
    }
    case 'dayOfMonth': {
      return calculateDayOfMonthInitialDate(baseDate, pattern)
    }
  }
}

const hasSameDays = (firstDays: readonly number[], secondDays: readonly number[]): boolean => {
  const firstDaySet = new Set(firstDays)
  const secondDaySet = new Set(secondDays)
  return firstDaySet.size === secondDaySet.size && [...firstDaySet].every(day => secondDaySet.has(day))
}

export const isSameRecurrence = (
  first: RecurrencePattern | null,
  second: RecurrencePattern | null,
): boolean => {
  if (!first || !second) {
    return first === second
  }

  switch (first.type) {
    case 'interval': {
      return second.type === 'interval' && first.unit === second.unit && first.value === second.value
    }
    case 'weekdays': {
      return second.type === 'weekdays' && hasSameDays(first.days, second.days)
    }
    case 'dayOfMonth': {
      return second.type === 'dayOfMonth' && first.day === second.day
    }
  }
}
