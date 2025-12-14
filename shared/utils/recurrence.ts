import type {
  DateReference,
  DayOfMonthRecurrence,
  IntervalRecurrence,
  RecurrencePattern,
  WeekdaysRecurrence,
} from '~~/shared/types/recurrence'

const calculateIntervalNextDate = (
  baseDate: Date,
  pattern: IntervalRecurrence,
): Date => {
  const result = new Date(baseDate)

  switch (pattern.unit) {
    case 'day': {
      result.setDate(result.getDate() + pattern.value)
      break
    }
    case 'week': {
      result.setDate(result.getDate() + pattern.value * 7)
      break
    }
    case 'month': {
      result.setMonth(result.getMonth() + pattern.value)
      break
    }
    case 'year': {
      result.setFullYear(result.getFullYear() + pattern.value)
      break
    }
  }

  return result
}

const calculateWeekdaysNextDate = (
  baseDate: Date,
  pattern: WeekdaysRecurrence,
): Date => {
  const result = new Date(baseDate)
  const sortedDays = [...pattern.days].sort((a, b) => a - b)
  const currentDay = result.getDay()

  const nextDay = sortedDays.find(d => d > currentDay)

  if (nextDay !== undefined) {
    result.setDate(result.getDate() + (nextDay - currentDay))
  }
  else {
    const firstDay = sortedDays[0] ?? 0
    const daysToAdd = 7 - currentDay + firstDay
    result.setDate(result.getDate() + daysToAdd)
  }

  return result
}

const calculateDayOfMonthNextDate = (
  baseDate: Date,
  pattern: DayOfMonthRecurrence,
): Date => {
  const result = new Date(baseDate)

  if (result.getDate() >= pattern.day) {
    result.setMonth(result.getMonth() + 1)
  }

  const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  const targetDay = Math.min(pattern.day, daysInMonth)
  result.setDate(targetDay)

  return result
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
): Date => {
  const result = new Date(baseDate)
  const sortedDays = [...pattern.days].sort((a, b) => a - b)
  const currentDay = result.getDay()

  if (sortedDays.includes(currentDay)) {
    return result
  }

  const nextDay = sortedDays.find(d => d > currentDay)

  if (nextDay !== undefined) {
    result.setDate(result.getDate() + (nextDay - currentDay))
  }
  else {
    const firstDay = sortedDays[0] ?? 0
    const daysToAdd = 7 - currentDay + firstDay
    result.setDate(result.getDate() + daysToAdd)
  }

  return result
}

const calculateDayOfMonthInitialDate = (
  baseDate: Date,
  pattern: DayOfMonthRecurrence,
): Date => {
  const result = new Date(baseDate)
  const currentDayOfMonth = result.getDate()

  if (currentDayOfMonth === pattern.day) {
    return result
  }

  if (currentDayOfMonth > pattern.day) {
    result.setMonth(result.getMonth() + 1)
  }

  const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  const targetDay = Math.min(pattern.day, daysInMonth)
  result.setDate(targetDay)

  return result
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
