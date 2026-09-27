import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import type { MonthData } from '../../shared/types/budget'
import {
  findClosestMonthForCopy,
  getNextMonth,
  getPreviousMonth,
  isCurrentMonth,
  isFirstMonth,
  isLastMonth,
  isPastMonth,
} from '../../shared/utils/budget/month-helpers'

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

interface CopySourceCase {
  year: number
  month: number
  direction: 'next' | 'previous'
  expected: string | undefined
}

const toMonthLabel = (year: number, month: number): string => `${MONTH_KEYS[month]}-${year}`

const createMonth = (year: number, month: number): MonthData => ({
  id: toMonthLabel(year, month),
  year,
  month,
  balanceSources: [],
  incomeEntries: [],
  expenseEntries: [],
  exchangeRates: { USD: 1 },
  exchangeRatesSource: `${year}-${String(month + 1).padStart(2, '0')}-01`,
})

const pinClock = (context: TestContext, localDateTime: string): void => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date(localDateTime) })
}

const nextMonthCases = [
  { name: 'the month after the only month', months: [createMonth(2026, 2)], expected: { year: 2026, month: 3 } },
  { name: 'January after December', months: [createMonth(2025, 11)], expected: { year: 2026, month: 0 } },
  {
    name: 'the month after the latest of unsorted months',
    months: [createMonth(2026, 2), createMonth(2025, 11), createMonth(2026, 0)],
    expected: { year: 2026, month: 3 },
  },
  {
    name: 'the month after the latest year',
    months: [createMonth(2024, 11), createMonth(2025, 11), createMonth(2025, 3)],
    expected: { year: 2026, month: 0 },
  },
]

nextMonthCases.forEach(({ name, months, expected }) => {
  test(`getNextMonth returns ${name}`, () => {
    assert.deepEqual(getNextMonth(months), expected)
  })
})

const previousMonthCases = [
  { name: 'the month before the only month', months: [createMonth(2026, 2)], expected: { year: 2026, month: 1 } },
  { name: 'December before January', months: [createMonth(2026, 0)], expected: { year: 2025, month: 11 } },
  {
    name: 'the month before the earliest of unsorted months',
    months: [createMonth(2026, 5), createMonth(2025, 1), createMonth(2026, 0)],
    expected: { year: 2025, month: 0 },
  },
  {
    name: 'the month before the earliest year',
    months: [createMonth(2026, 0), createMonth(2025, 0), createMonth(2025, 11)],
    expected: { year: 2024, month: 11 },
  },
]

previousMonthCases.forEach(({ name, months, expected }) => {
  test(`getPreviousMonth returns ${name}`, () => {
    assert.deepEqual(getPreviousMonth(months), expected)
  })
})

test('getNextMonth and getPreviousMonth start at the current month when there are no months', (context) => {
  pinClock(context, '2026-06-15T12:00')

  assert.deepEqual([getNextMonth([]), getPreviousMonth([])], [{ year: 2026, month: 5 }, { year: 2026, month: 5 }])
})

test('getNextMonth uses the local calendar at the start of a year', (context) => {
  pinClock(context, '2027-01-01T00:30')

  assert.deepEqual(getNextMonth([]), { year: 2027, month: 0 })
})

test('getNextMonth and getPreviousMonth leave the months untouched', () => {
  const months = [createMonth(2026, 2), createMonth(2025, 11), createMonth(2026, 0)]
  const snapshot = structuredClone(months)

  getNextMonth(months)
  getPreviousMonth(months)

  assert.deepEqual(months, snapshot)
})

const copySourceMonths = [createMonth(2026, 2), createMonth(2025, 10), createMonth(2026, 5), createMonth(2026, 0)]

const copySourceCases: CopySourceCase[] = [
  { year: 2025, month: 11, direction: 'next', expected: 'jan-2026' },
  { year: 2025, month: 11, direction: 'previous', expected: 'nov-2025' },
  { year: 2026, month: 1, direction: 'next', expected: 'mar-2026' },
  { year: 2026, month: 1, direction: 'previous', expected: 'jan-2026' },
  { year: 2026, month: 2, direction: 'next', expected: 'jun-2026' },
  { year: 2026, month: 2, direction: 'previous', expected: 'jan-2026' },
  { year: 2026, month: 6, direction: 'next', expected: undefined },
  { year: 2025, month: 9, direction: 'previous', expected: undefined },
]

copySourceCases.forEach(({ year, month, direction, expected }) => {
  test(`findClosestMonthForCopy picks ${expected ?? 'nothing'} as the ${direction} month for ${toMonthLabel(year, month)}`, () => {
    assert.equal(findClosestMonthForCopy(copySourceMonths, year, month, direction), expected)
  })
})

test('findClosestMonthForCopy finds nothing without months', () => {
  assert.deepEqual(
    [findClosestMonthForCopy([], 2026, 0, 'next'), findClosestMonthForCopy([], 2026, 0, 'previous')],
    [undefined, undefined],
  )
})

test('isFirstMonth and isLastMonth compare months across years', () => {
  const months = [createMonth(2026, 0), createMonth(2025, 11), createMonth(2026, 1)]

  assert.deepEqual(months.map(month => [month.id, isFirstMonth(month, months), isLastMonth(month, months)]), [
    ['jan-2026', false, false],
    ['dec-2025', true, false],
    ['feb-2026', false, true],
  ])
})

test('isFirstMonth and isLastMonth are false without months', () => {
  const month = createMonth(2026, 0)

  assert.deepEqual([isFirstMonth(month, []), isLastMonth(month, [])], [false, false])
})

test('isFirstMonth treats a lone month as the first month', () => {
  const month = createMonth(2026, 0)

  assert.equal(isFirstMonth(month, [month]), true)
})

test('isLastMonth treats a lone month as the last month', () => {
  const month = createMonth(2026, 0)

  assert.equal(isLastMonth(month, [month]), true)
})

test('isCurrentMonth matches only the month and year of today', (context) => {
  pinClock(context, '2026-06-15T12:00')
  const months = [createMonth(2026, 5), createMonth(2026, 4), createMonth(2026, 6), createMonth(2025, 5)]

  assert.deepEqual(months.map(month => [month.id, isCurrentMonth(month)]), [
    ['jun-2026', true],
    ['may-2026', false],
    ['jul-2026', false],
    ['jun-2025', false],
  ])
})

const pastMonthCases = [
  { now: '2026-01-15T12:00', year: 2025, month: 11, expected: true },
  { now: '2026-01-15T12:00', year: 2025, month: 0, expected: true },
  { now: '2026-01-15T12:00', year: 2026, month: 0, expected: false },
  { now: '2026-01-15T12:00', year: 2026, month: 1, expected: false },
  { now: '2026-01-15T12:00', year: 2027, month: 0, expected: false },
  { now: '2026-12-31T23:59', year: 2026, month: 10, expected: true },
  { now: '2026-12-31T23:59', year: 2026, month: 11, expected: false },
  { now: '2026-12-31T23:59', year: 2027, month: 0, expected: false },
  { now: '2026-07-01T00:30', year: 2026, month: 5, expected: true },
  { now: '2026-07-01T00:30', year: 2026, month: 6, expected: false },
]

pastMonthCases.forEach(({ now, year, month, expected }) => {
  test(`isPastMonth on ${now} says ${toMonthLabel(year, month)} is ${expected ? 'past' : 'not past'}`, (context) => {
    pinClock(context, now)

    assert.equal(isPastMonth(year, month), expected)
  })
})
