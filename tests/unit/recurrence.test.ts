import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import type { IntervalUnit, RecurrencePattern } from '../../shared/types/recurrence'
import {
  calculateInitialDate,
  calculateNextDate,
  formatDateForDb,
  isSameRecurrence,
} from '../../shared/utils/recurrence'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_OVERFLOW = 'P2-03 month overflow'

interface DateCase {
  pattern: RecurrencePattern
  from: string
  expected: string
  bug?: string
}

interface SameRecurrenceCase {
  name: string
  first: RecurrencePattern | null
  second: RecurrencePattern | null
  expected: boolean
  bug?: string
}

const interval = (unit: IntervalUnit, value: number): RecurrencePattern => ({ type: 'interval', unit, value })

const weekdays = (...days: number[]): RecurrencePattern => ({ type: 'weekdays', days })

const dayOfMonth = (day: number): RecurrencePattern => ({ type: 'dayOfMonth', day })

const localDate = (day: string): Date => new Date(`${day}T00:00`)

const toDay = (date: Date): string => [
  String(date.getFullYear()),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-')

const describeDay = (day: string): string => `${WEEKDAY_NAMES[localDate(day).getDay()]} ${day}`

const describePattern = (pattern: RecurrencePattern): string => {
  switch (pattern.type) {
    case 'interval': {
      return `every ${pattern.value} ${pattern.unit}`
    }
    case 'weekdays': {
      return `on ${pattern.days.map(day => WEEKDAY_NAMES[day]).join(', ')}`
    }
    case 'dayOfMonth': {
      return `on day ${pattern.day}`
    }
  }
}

const pinClock = (context: TestContext, localDateTime: string): void => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date(localDateTime) })
}

const nextDateCases: DateCase[] = [
  { pattern: interval('day', 1), from: '2026-01-31', expected: '2026-02-01' },
  { pattern: interval('day', 1), from: '2026-02-28', expected: '2026-03-01' },
  { pattern: interval('day', 1), from: '2028-02-28', expected: '2028-02-29' },
  { pattern: interval('day', 3), from: '2026-12-30', expected: '2027-01-02' },
  { pattern: interval('week', 1), from: '2026-01-28', expected: '2026-02-04' },
  { pattern: interval('week', 2), from: '2026-12-24', expected: '2027-01-07' },
  { pattern: interval('month', 1), from: '2026-01-15', expected: '2026-02-15' },
  { pattern: interval('month', 1), from: '2026-12-15', expected: '2027-01-15' },
  { pattern: interval('month', 1), from: '2026-01-31', expected: '2026-02-28', bug: MONTH_OVERFLOW },
  { pattern: interval('month', 1), from: '2026-03-31', expected: '2026-04-30', bug: MONTH_OVERFLOW },
  { pattern: interval('month', 1), from: '2028-01-31', expected: '2028-02-29', bug: MONTH_OVERFLOW },
  { pattern: interval('month', 3), from: '2026-11-30', expected: '2027-02-28', bug: MONTH_OVERFLOW },
  { pattern: interval('year', 1), from: '2026-06-15', expected: '2027-06-15' },
  { pattern: interval('year', 4), from: '2028-02-29', expected: '2032-02-29' },
  { pattern: interval('year', 1), from: '2028-02-29', expected: '2029-02-28', bug: MONTH_OVERFLOW },
  { pattern: weekdays(1, 3, 5), from: '2026-01-05', expected: '2026-01-07' },
  { pattern: weekdays(1, 3, 5), from: '2026-01-07', expected: '2026-01-09' },
  { pattern: weekdays(1, 3, 5), from: '2026-01-09', expected: '2026-01-12' },
  { pattern: weekdays(1, 3, 5), from: '2026-01-10', expected: '2026-01-12' },
  { pattern: weekdays(5, 1, 3), from: '2026-01-09', expected: '2026-01-12' },
  { pattern: weekdays(0), from: '2026-01-11', expected: '2026-01-18' },
  { pattern: weekdays(0), from: '2026-01-10', expected: '2026-01-11' },
  { pattern: weekdays(6), from: '2026-01-11', expected: '2026-01-17' },
  { pattern: weekdays(1), from: '2026-12-30', expected: '2027-01-04' },
  { pattern: weekdays(0, 6), from: '2026-02-27', expected: '2026-02-28' },
  { pattern: weekdays(0), from: '2026-02-28', expected: '2026-03-01' },
  { pattern: weekdays(2), from: '2028-02-28', expected: '2028-02-29' },
  { pattern: dayOfMonth(15), from: '2026-01-10', expected: '2026-01-15' },
  { pattern: dayOfMonth(15), from: '2026-01-15', expected: '2026-02-15' },
  { pattern: dayOfMonth(15), from: '2026-01-20', expected: '2026-02-15' },
  { pattern: dayOfMonth(5), from: '2026-12-20', expected: '2027-01-05' },
  { pattern: dayOfMonth(31), from: '2026-01-10', expected: '2026-01-31' },
  { pattern: dayOfMonth(31), from: '2026-02-10', expected: '2026-02-28' },
  { pattern: dayOfMonth(31), from: '2026-12-31', expected: '2027-01-31' },
  { pattern: dayOfMonth(29), from: '2028-01-29', expected: '2028-02-29' },
  { pattern: dayOfMonth(29), from: '2028-02-29', expected: '2028-03-29' },
  { pattern: dayOfMonth(31), from: '2026-01-31', expected: '2026-02-28', bug: MONTH_OVERFLOW },
  { pattern: dayOfMonth(31), from: '2026-02-28', expected: '2026-03-31', bug: MONTH_OVERFLOW },
  { pattern: dayOfMonth(31), from: '2026-03-31', expected: '2026-04-30', bug: MONTH_OVERFLOW },
  { pattern: dayOfMonth(31), from: '2026-04-30', expected: '2026-05-31', bug: MONTH_OVERFLOW },
  { pattern: dayOfMonth(15), from: '2026-01-31', expected: '2026-02-15', bug: MONTH_OVERFLOW },
  { pattern: dayOfMonth(30), from: '2028-01-30', expected: '2028-02-29', bug: MONTH_OVERFLOW },
  { pattern: dayOfMonth(31), from: '2028-02-29', expected: '2028-03-31', bug: MONTH_OVERFLOW },
]

nextDateCases.forEach(({ pattern, from, expected, bug }) => {
  test(`calculateNextDate ${describePattern(pattern)} after ${describeDay(from)} is ${describeDay(expected)}`, { todo: bug }, () => {
    assert.equal(toDay(calculateNextDate(pattern, localDate(from), 'planned')), expected)
  })
})

test('calculateNextDate counts from today when the reference is now', (context) => {
  pinClock(context, '2026-03-10T09:30')
  const plannedDate = localDate('2025-06-01')

  assert.deepEqual(
    [interval('day', 1), weekdays(1), dayOfMonth(10)].map(pattern => toDay(calculateNextDate(pattern, plannedDate, 'now'))),
    ['2026-03-11', '2026-03-16', '2026-04-10'],
  )
})

test('calculateNextDate counts from the planned date when the reference is planned', (context) => {
  pinClock(context, '2026-03-10T09:30')

  assert.equal(toDay(calculateNextDate(interval('day', 1), localDate('2025-06-01'), 'planned')), '2025-06-02')
})

test('calculateNextDate of a stored planned date round-trips through the database format', () => {
  const storedPlannedDate = '2026-01-20T00:00'

  assert.equal(formatDateForDb(calculateNextDate(dayOfMonth(15), new Date(storedPlannedDate), 'planned')), '2026-02-15T00:00')
})

test('calculateNextDate and calculateInitialDate leave the given date untouched', () => {
  const plannedDate = localDate('2026-01-20')
  const patterns = [interval('month', 1), weekdays(1), dayOfMonth(15)]

  patterns.forEach((pattern) => {
    calculateNextDate(pattern, plannedDate, 'planned')
    calculateInitialDate(pattern, plannedDate)
  })

  assert.equal(toDay(plannedDate), '2026-01-20')
})

const initialDateCases: DateCase[] = [
  { pattern: interval('week', 2), from: '2026-01-31', expected: '2026-01-31' },
  { pattern: weekdays(1, 3, 5), from: '2026-01-05', expected: '2026-01-05' },
  { pattern: weekdays(1, 3, 5), from: '2026-01-06', expected: '2026-01-07' },
  { pattern: weekdays(1), from: '2026-01-10', expected: '2026-01-12' },
  { pattern: weekdays(0), from: '2026-01-10', expected: '2026-01-11' },
  { pattern: weekdays(1), from: '2026-12-30', expected: '2027-01-04' },
  { pattern: weekdays(2), from: '2028-02-28', expected: '2028-02-29' },
  { pattern: dayOfMonth(15), from: '2026-01-15', expected: '2026-01-15' },
  { pattern: dayOfMonth(15), from: '2026-01-10', expected: '2026-01-15' },
  { pattern: dayOfMonth(15), from: '2026-01-20', expected: '2026-02-15' },
  { pattern: dayOfMonth(1), from: '2026-12-15', expected: '2027-01-01' },
  { pattern: dayOfMonth(31), from: '2026-02-10', expected: '2026-02-28' },
  { pattern: dayOfMonth(31), from: '2026-02-28', expected: '2026-02-28' },
  { pattern: dayOfMonth(31), from: '2026-04-30', expected: '2026-04-30' },
  { pattern: dayOfMonth(29), from: '2028-02-01', expected: '2028-02-29' },
  { pattern: dayOfMonth(29), from: '2027-02-01', expected: '2027-02-28' },
  { pattern: dayOfMonth(15), from: '2026-01-31', expected: '2026-02-15', bug: MONTH_OVERFLOW },
  { pattern: dayOfMonth(30), from: '2026-01-31', expected: '2026-02-28', bug: MONTH_OVERFLOW },
  { pattern: dayOfMonth(28), from: '2026-03-31', expected: '2026-04-28', bug: MONTH_OVERFLOW },
]

initialDateCases.forEach(({ pattern, from, expected, bug }) => {
  test(`calculateInitialDate ${describePattern(pattern)} from ${describeDay(from)} is ${describeDay(expected)}`, { todo: bug }, () => {
    assert.equal(toDay(calculateInitialDate(pattern, localDate(from))), expected)
  })
})

test('calculateInitialDate starts from today without a chosen date', (context) => {
  pinClock(context, '2026-03-10T09:30')

  assert.deepEqual(
    [interval('day', 1), weekdays(2), weekdays(1), dayOfMonth(15)].map(pattern => toDay(calculateInitialDate(pattern, null))),
    ['2026-03-10', '2026-03-10', '2026-03-16', '2026-03-15'],
  )
})

const databaseDateCases = [
  { date: new Date(2026, 0, 5, 15, 45), expected: '2026-01-05T00:00' },
  { date: new Date(2026, 11, 31, 23, 59), expected: '2026-12-31T00:00' },
  { date: new Date(2028, 1, 29), expected: '2028-02-29T00:00' },
]

databaseDateCases.forEach(({ date, expected }) => {
  test(`formatDateForDb keeps the local day of ${expected.slice(0, 10)} and drops the time`, () => {
    assert.equal(formatDateForDb(date), expected)
  })
})

const sameRecurrenceCases: SameRecurrenceCase[] = [
  { name: 'two missing patterns', first: null, second: null, expected: true },
  { name: 'a pattern and a missing one', first: interval('day', 1), second: null, expected: false },
  { name: 'a missing pattern and a pattern', first: null, second: weekdays(1), expected: false },
  { name: 'equal intervals', first: interval('week', 2), second: interval('week', 2), expected: true },
  { name: 'intervals with different units', first: interval('day', 7), second: interval('week', 1), expected: false },
  { name: 'intervals with different values', first: interval('month', 1), second: interval('month', 2), expected: false },
  { name: 'the same weekdays in another order', first: weekdays(1, 3, 5), second: weekdays(5, 1, 3), expected: true },
  { name: 'fewer weekdays', first: weekdays(1, 3), second: weekdays(1, 3, 5), expected: false },
  { name: 'equal days of month', first: dayOfMonth(31), second: dayOfMonth(31), expected: true },
  { name: 'different days of month', first: dayOfMonth(1), second: dayOfMonth(15), expected: false },
  { name: 'different pattern types', first: interval('month', 1), second: dayOfMonth(1), expected: false },
  {
    name: 'weekday lists where one repeats a day',
    first: weekdays(1, 1, 3),
    second: weekdays(1, 3, 5),
    expected: false,
    bug: 'a repeated weekday makes the comparison one-sided',
  },
]

sameRecurrenceCases.forEach(({ name, first, second, expected, bug }) => {
  test(`isSameRecurrence says ${name} are ${expected ? 'the same' : 'different'}`, { todo: bug }, () => {
    assert.equal(isSameRecurrence(first, second), expected)
  })
})
