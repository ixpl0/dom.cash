import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test, type TestContext } from 'node:test'
import type {
  BalanceSourceData,
  ComputedMonthData,
  ExpenseEntryData,
  IncomeEntryData,
  MonthData,
} from '../../shared/types/budget'
import { budgetExportSchema, type BudgetExportSchema } from '../../shared/types/export-import'
import { formatAmount } from '../../shared/utils/budget/budget'
import {
  computeExpectedBalances,
  computeMonthData,
  computeYearSummary,
  createMonthId,
} from '../../shared/utils/budget/budget-calculations'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTH_RATES = { USD: 1, EUR: 0.5, GEL: 2.5 }
const NEXT_MONTH_RATES = { USD: 1, EUR: 0.4, GEL: 2 }

type MonthMetric = 'startBalance' | 'totalIncome' | 'totalExpenses' | 'totalOptionalExpenses'
  | 'nextMonthStartBalance' | 'calculatedBalanceChange' | 'currencyProfitLoss'
  | 'calculatedPocketExpenses' | 'totalAllExpenses' | 'plannedVsActualDiff'

type MonthMetrics = Partial<Record<MonthMetric, number | null>>

interface MonthInput {
  year: number
  month: number
  balances?: BalanceSourceData[]
  incomes?: IncomeEntryData[]
  expenses?: ExpenseEntryData[]
  rates?: Record<string, number>
  ratesSource?: string
}

const toMonthKey = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`

const toRatesDate = (year: number, month: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}-01`

const balance = (amount: number, currency: string): BalanceSourceData => ({
  id: `balance-${amount}-${currency}`,
  description: `Savings in ${currency}`,
  amount,
  currency,
})

const income = (amount: number, currency: string): IncomeEntryData => ({
  id: `income-${amount}-${currency}`,
  description: `Salary in ${currency}`,
  amount,
  currency,
  date: null,
})

const expense = (amount: number, currency: string, isOptional = false): ExpenseEntryData => ({
  id: `expense-${amount}-${currency}`,
  description: `Purchase in ${currency}`,
  amount,
  currency,
  date: null,
  isOptional,
})

const createMonth = ({
  year,
  month,
  balances = [],
  incomes = [],
  expenses = [],
  rates = { USD: 1 },
  ratesSource = toRatesDate(year, month),
}: MonthInput): MonthData => ({
  id: `month-${toMonthKey(year, month)}`,
  year,
  month,
  userMonthId: `user-month-${toMonthKey(year, month)}`,
  balanceSources: balances,
  incomeEntries: incomes,
  expenseEntries: expenses,
  balanceChange: 0,
  pocketExpenses: 0,
  income: 0,
  exchangeRates: rates,
  exchangeRatesSource: ratesSource,
})

const createPlanOnlyMonth = (year: number, month: number): MonthData => ({
  ...createMonth({ year, month, rates: {}, ratesSource: '' }),
  id: `plan-only-${toMonthKey(year, month)}`,
  isPlanOnly: true,
})

const createSpendingMonth = (year: number, month: number): MonthData => createMonth({
  year,
  month,
  balances: [balance(1000, 'USD'), balance(200, 'EUR'), balance(500, 'GEL')],
  incomes: [income(300, 'USD'), income(250, 'GEL')],
  expenses: [expense(100, 'USD'), expense(50, 'EUR', true), expense(125, 'GEL', true)],
  rates: MONTH_RATES,
})

const createFollowingMonth = (year: number, month: number): MonthData => createMonth({
  year,
  month,
  balances: [balance(900, 'USD'), balance(200, 'EUR'), balance(250, 'GEL')],
  rates: NEXT_MONTH_RATES,
})

const createComputedMonth = (
  year: number,
  month: number,
  values: Partial<ComputedMonthData> = {},
): ComputedMonthData => ({
  ...createMonth({ year, month }),
  monthId: toMonthKey(year, month),
  startBalance: null,
  totalIncome: 0,
  totalExpenses: 0,
  totalOptionalExpenses: 0,
  calculatedBalanceChange: null,
  calculatedPocketExpenses: null,
  currencyProfitLoss: null,
  totalAllExpenses: null,
  nextMonthStartBalance: null,
  isUsingOtherMonthRates: false,
  sourceMonthTitle: '',
  plannedBalanceChange: null,
  plannedVsActualDiff: null,
  expectedBalance: null,
  planComment: null,
  ...values,
})

const isClose = (actual: number | null, expected: number | null): boolean =>
  actual === null || expected === null
    ? actual === expected
    : Math.abs(actual - expected) < 1e-9

const assertMetrics = (month: ComputedMonthData, expected: MonthMetrics): void => {
  const mismatches = (Object.keys(expected) as MonthMetric[])
    .filter(metric => !isClose(month[metric], expected[metric] ?? null))
    .map(metric => `${metric}: expected ${expected[metric]}, received ${month[metric]}`)

  assert.deepEqual(mismatches, [])
}

const pinClock = (context: TestContext, localDateTime: string): void => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date(localDateTime) })
}

const toExpectedBalances = (months: ComputedMonthData[]): Record<string, number | null> =>
  Object.fromEntries(months.map(month => [month.monthId, month.expectedBalance]))

const readBudgetFixture = (fileName: string): BudgetExportSchema => budgetExportSchema.parse(
  JSON.parse(readFileSync(new URL(`../e2e/fixtures/budgets/${fileName}`, import.meta.url), 'utf8')),
)

const toMonthData = ({ year, month, entries }: BudgetExportSchema['months'][number]): MonthData => createMonth({
  year,
  month,
  balances: entries.filter(entry => entry.kind === 'balance').map(entry => balance(entry.amount, entry.currency)),
  incomes: entries.filter(entry => entry.kind === 'income').map(entry => income(entry.amount, entry.currency)),
  expenses: entries.filter(entry => entry.kind === 'expense').map(entry => expense(entry.amount, entry.currency)),
})

test('createMonthId pads the zero-based month index to two digits', () => {
  assert.deepEqual(
    [createMonthId(2026, 0), createMonthId(2026, 8), createMonthId(2026, 11)],
    ['2026-00', '2026-08', '2026-11'],
  )
})

const mainCurrencyCases = [
  {
    mainCurrency: 'USD',
    expected: {
      startBalance: 1600,
      totalIncome: 400,
      totalExpenses: 250,
      totalOptionalExpenses: 150,
      nextMonthStartBalance: 1525,
      calculatedBalanceChange: -75,
      currencyProfitLoss: 125,
      calculatedPocketExpenses: 350,
      totalAllExpenses: 600,
    },
  },
  {
    mainCurrency: 'GEL',
    expected: {
      startBalance: 4000,
      totalIncome: 1000,
      totalExpenses: 625,
      totalOptionalExpenses: 375,
      nextMonthStartBalance: 3050,
      calculatedBalanceChange: -950,
      currencyProfitLoss: -450,
      calculatedPocketExpenses: 875,
      totalAllExpenses: 1500,
    },
  },
]

mainCurrencyCases.forEach(({ mainCurrency, expected }) => {
  test(`computeMonthData reports a month in ${mainCurrency} at its own rates and the next month at both rates`, () => {
    const month = createSpendingMonth(2026, 2)
    const nextMonth = createFollowingMonth(2026, 3)

    assertMetrics(computeMonthData(month, [nextMonth, month], mainCurrency, MONTH_NAMES), expected)
  })

  test(`computeMonthData in ${mainCurrency} keeps the balance change equal to income minus all expenses plus the currency result`, () => {
    const month = createSpendingMonth(2026, 2)
    const result = computeMonthData(month, [month, createFollowingMonth(2026, 3)], mainCurrency, MONTH_NAMES)
    const { totalIncome, totalAllExpenses, currencyProfitLoss, calculatedBalanceChange } = result

    assert.ok(totalAllExpenses !== null && currencyProfitLoss !== null)
    assert.ok(isClose(calculatedBalanceChange, totalIncome - totalAllExpenses + currencyProfitLoss))
  })
})

test('computeMonthData keeps the month fields and passes the plan through', () => {
  const month = createSpendingMonth(2026, 2)
  const months = [month, createFollowingMonth(2026, 3)]
  const withPlan = computeMonthData(month, months, 'USD', MONTH_NAMES, 120, 'Save for a trip')
  const withoutPlan = computeMonthData(month, months, 'USD', MONTH_NAMES)

  assert.deepEqual(
    {
      id: withPlan.id,
      monthId: withPlan.monthId,
      balanceSources: withPlan.balanceSources,
      plannedBalanceChange: withPlan.plannedBalanceChange,
      planComment: withPlan.planComment,
      expectedBalance: withPlan.expectedBalance,
    },
    {
      id: month.id,
      monthId: '2026-02',
      balanceSources: month.balanceSources,
      plannedBalanceChange: 120,
      planComment: 'Save for a trip',
      expectedBalance: null,
    },
  )
  assert.deepEqual([withoutPlan.plannedBalanceChange, withoutPlan.planComment], [null, null])
})

test('computeMonthData leaves the months untouched', () => {
  const month = createSpendingMonth(2026, 2)
  const months = [month, createFollowingMonth(2026, 3)]
  const snapshot = structuredClone(months)

  computeMonthData(month, months, 'GEL', MONTH_NAMES, 50, 'Plan')

  assert.deepEqual(months, snapshot)
})

test('computeMonthData takes January of the next year as the month after December', () => {
  const december = createMonth({ year: 2025, month: 11, balances: [balance(1000, 'USD')], incomes: [income(300, 'USD')] })
  const nextJanuary = createMonth({ year: 2026, month: 0, balances: [balance(1200, 'USD')] })
  const sameYearJanuary = createMonth({ year: 2025, month: 0, balances: [balance(5, 'USD')] })

  assertMetrics(computeMonthData(december, [sameYearJanuary, december, nextJanuary], 'USD', MONTH_NAMES), {
    startBalance: 1000,
    nextMonthStartBalance: 1200,
    calculatedBalanceChange: 200,
    currencyProfitLoss: 0,
    calculatedPocketExpenses: 100,
    totalAllExpenses: 100,
  })
})

const withoutNextMonthCases = [
  { name: 'there is no next month', createOtherMonths: (): MonthData[] => [] },
  { name: 'the next month is only a plan', createOtherMonths: (): MonthData[] => [createPlanOnlyMonth(2026, 3)] },
  { name: 'the closest later month is two months ahead', createOtherMonths: (): MonthData[] => [createFollowingMonth(2026, 4)] },
]

withoutNextMonthCases.forEach(({ name, createOtherMonths }) => {
  test(`computeMonthData leaves next-month metrics empty when ${name}`, () => {
    const month = createSpendingMonth(2026, 2)

    assertMetrics(computeMonthData(month, [month, ...createOtherMonths()], 'USD', MONTH_NAMES, 100), {
      startBalance: 1600,
      totalIncome: 400,
      totalExpenses: 250,
      totalOptionalExpenses: 150,
      nextMonthStartBalance: null,
      calculatedBalanceChange: null,
      currencyProfitLoss: null,
      calculatedPocketExpenses: null,
      totalAllExpenses: null,
      plannedVsActualDiff: null,
    })
  })
})

test('computeMonthData gives a plan-only month entry totals and the next start but no balance metrics', () => {
  const planOnlyMonth = createPlanOnlyMonth(2026, 3)
  const nextMonth = createMonth({
    year: 2026,
    month: 4,
    balances: [balance(700, 'USD'), balance(500, 'GEL')],
    rates: NEXT_MONTH_RATES,
  })
  const result = computeMonthData(planOnlyMonth, [planOnlyMonth, nextMonth], 'USD', MONTH_NAMES, 200, 'Plan only')

  assertMetrics(result, {
    startBalance: null,
    totalIncome: 0,
    totalExpenses: 0,
    totalOptionalExpenses: 0,
    nextMonthStartBalance: 950,
    calculatedBalanceChange: null,
    currencyProfitLoss: null,
    calculatedPocketExpenses: null,
    totalAllExpenses: null,
    plannedVsActualDiff: null,
  })
  assert.equal(result.plannedBalanceChange, 200)
})

const plannedDifferenceCases = [
  { name: 'compares a past month with its plan', month: 2, plannedChange: -100, hasNextMonth: true, expected: 25 },
  { name: 'skips the current month', month: 5, plannedChange: -100, hasNextMonth: true, expected: null },
  { name: 'skips a future month', month: 7, plannedChange: -100, hasNextMonth: true, expected: null },
  { name: 'skips a past month without a plan', month: 2, plannedChange: null, hasNextMonth: true, expected: null },
  { name: 'skips a past month without a next month', month: 2, plannedChange: -100, hasNextMonth: false, expected: null },
]

plannedDifferenceCases.forEach(({ name, month, plannedChange, hasNextMonth, expected }) => {
  test(`computeMonthData plan difference ${name}`, (context) => {
    pinClock(context, '2026-06-15T12:00')
    const spendingMonth = createSpendingMonth(2026, month)
    const months = hasNextMonth ? [spendingMonth, createFollowingMonth(2026, month + 1)] : [spendingMonth]

    assertMetrics(computeMonthData(spendingMonth, months, 'USD', MONTH_NAMES, plannedChange), {
      plannedVsActualDiff: expected,
    })
  })
})

const ratesSourceCases = [
  { name: 'its own month', year: 2026, month: 2, source: '2026-03-01', isUsingOtherMonthRates: false, title: '' },
  { name: 'the previous month', year: 2026, month: 2, source: '2026-02-01', isUsingOtherMonthRates: true, title: 'February 2026' },
  { name: 'December of the previous year', year: 2026, month: 0, source: '2025-12-01', isUsingOtherMonthRates: true, title: 'December 2025' },
  { name: 'its own month in December', year: 2026, month: 11, source: '2026-12-01', isUsingOtherMonthRates: false, title: '' },
  { name: 'an empty source', year: 2026, month: 2, source: '', isUsingOtherMonthRates: true, title: '' },
  { name: 'a source with an impossible month', year: 2026, month: 2, source: '2026-13-01', isUsingOtherMonthRates: true, title: '' },
]

ratesSourceCases.forEach(({ name, year, month, source, isUsingOtherMonthRates, title }) => {
  test(`computeMonthData describes rates taken from ${name}`, () => {
    const monthData = createMonth({ year, month, ratesSource: source })
    const result = computeMonthData(monthData, [monthData], 'USD', MONTH_NAMES)

    assert.deepEqual(
      { isUsingOtherMonthRates: result.isUsingOtherMonthRates, sourceMonthTitle: result.sourceMonthTitle },
      { isUsingOtherMonthRates, sourceMonthTitle: title },
    )
  })
})

test('computeMonthData marks default rates as rates of another month', () => {
  const monthData = createMonth({ year: 2026, month: 2, ratesSource: 'default' })
  const result = computeMonthData(monthData, [monthData], 'USD', MONTH_NAMES)

  assert.equal(result.isUsingOtherMonthRates, true)
  assert.notEqual(result.sourceMonthTitle, '')
})

test('computeMonthData shows zero pocket expenses for a month that balances exactly', { todo: 'floating point leftovers are shown as "-$0"' }, () => {
  const month = createMonth({ year: 2026, month: 2, balances: [balance(0.3, 'USD')], expenses: [expense(0.1, 'USD'), expense(0.2, 'USD')] })
  const nextMonth = createMonth({ year: 2026, month: 3 })
  const { calculatedPocketExpenses } = computeMonthData(month, [month, nextMonth], 'USD', MONTH_NAMES)

  assert.ok(calculatedPocketExpenses !== null)
  assert.equal(formatAmount(calculatedPocketExpenses, 'USD'), '$0')
})

const fixtureCases = [
  {
    fileName: 'two-months-basic.json',
    expected: {
      startBalance: 100,
      totalIncome: 200,
      totalExpenses: 50,
      nextMonthStartBalance: 100,
      calculatedBalanceChange: 0,
      currencyProfitLoss: 0,
      calculatedPocketExpenses: 150,
      totalAllExpenses: 200,
    },
  },
  {
    fileName: 'extended-data.json',
    expected: {
      startBalance: 200,
      totalIncome: 210,
      totalExpenses: 70,
      nextMonthStartBalance: 200,
      calculatedBalanceChange: 0,
      currencyProfitLoss: 0,
      calculatedPocketExpenses: 140,
      totalAllExpenses: 210,
    },
  },
]

fixtureCases.forEach(({ fileName, expected }) => {
  test(`computeMonthData reports the first month of the ${fileName} fixture`, () => {
    const months = readBudgetFixture(fileName).months.map(toMonthData)
    const [firstMonth, lastMonth] = months.toSorted((left, right) => (left.year * 12 + left.month) - (right.year * 12 + right.month))

    assert.ok(firstMonth && lastMonth)
    assertMetrics(computeMonthData(firstMonth, months, 'USD', MONTH_NAMES), expected)
    assertMetrics(computeMonthData(lastMonth, months, 'USD', MONTH_NAMES), { nextMonthStartBalance: null, calculatedPocketExpenses: null })
  })
})

const expectedBalanceCases = [
  {
    name: 'past months end at the next start and later months add their plans to a running balance',
    now: '2026-06-15T12:00',
    months: [
      createComputedMonth(2026, 7, { isPlanOnly: true }),
      createComputedMonth(2026, 6, { startBalance: 1320, plannedBalanceChange: -100 }),
      createComputedMonth(2026, 5, { startBalance: 1300, nextMonthStartBalance: 1320, plannedBalanceChange: 200 }),
      createComputedMonth(2026, 4, { startBalance: 1250, nextMonthStartBalance: 1300 }),
      createComputedMonth(2026, 3, { startBalance: 1100, nextMonthStartBalance: 1250 }),
      createComputedMonth(2026, 2, { startBalance: 1000, nextMonthStartBalance: 1100 }),
    ],
    expected: { '2026-07': 1400, '2026-06': 1400, '2026-05': 1500, '2026-04': 1300, '2026-03': 1250, '2026-02': 1100 },
  },
  {
    name: 'a past month without a next month keeps its own start balance',
    now: '2026-06-15T12:00',
    months: [createComputedMonth(2026, 2, { startBalance: 1000 })],
    expected: { '2026-02': 1000 },
  },
  {
    name: 'the first upcoming month without earlier months anchors on its own start balance',
    now: '2026-06-15T12:00',
    months: [
      createComputedMonth(2026, 6, { startBalance: 2000, plannedBalanceChange: 300 }),
      createComputedMonth(2026, 7, { isPlanOnly: true, plannedBalanceChange: -500 }),
    ],
    expected: { '2026-06': 2300, '2026-07': 1800 },
  },
  {
    name: 'a plan-only first month starts from zero',
    now: '2026-06-15T12:00',
    months: [createComputedMonth(2026, 6, { isPlanOnly: true, plannedBalanceChange: 300 })],
    expected: { '2026-06': 300 },
  },
  {
    name: 'a past plan-only month ends at the next start',
    now: '2026-06-15T12:00',
    months: [
      createComputedMonth(2026, 2, { isPlanOnly: true, nextMonthStartBalance: 1200 }),
      createComputedMonth(2026, 3, { startBalance: 1200, nextMonthStartBalance: 1150 }),
      createComputedMonth(2026, 4, { startBalance: 1150 }),
    ],
    expected: { '2026-02': 1200, '2026-03': 1150, '2026-04': 1150 },
  },
  {
    name: 'a past plan-only month without a next month has no expected balance',
    now: '2026-06-15T12:00',
    months: [
      createComputedMonth(2026, 2, { isPlanOnly: true }),
      createComputedMonth(2026, 5, { startBalance: 1300, plannedBalanceChange: 100 }),
    ],
    expected: { '2026-02': null, '2026-05': 1400 },
  },
  {
    name: 'the running balance continues from December into January',
    now: '2025-11-15T12:00',
    months: [
      createComputedMonth(2026, 0, { isPlanOnly: true, plannedBalanceChange: 25 }),
      createComputedMonth(2025, 9, { startBalance: 900, nextMonthStartBalance: 1000 }),
      createComputedMonth(2025, 11, { isPlanOnly: true, plannedBalanceChange: 50 }),
      createComputedMonth(2025, 10, { startBalance: 1000, plannedBalanceChange: 100 }),
    ],
    expected: { '2026-00': 1175, '2025-09': 1000, '2025-11': 1150, '2025-10': 1100 },
  },
  {
    name: 'the current month after a gap anchors on its own start balance',
    now: '2026-06-15T12:00',
    todo: 'a gap before the current month keeps the stale start of an older month',
    months: [
      createComputedMonth(2026, 2, { startBalance: 1000 }),
      createComputedMonth(2026, 5, { startBalance: 1300, plannedBalanceChange: 200 }),
    ],
    expected: { '2026-02': 1000, '2026-05': 1500 },
  },
]

expectedBalanceCases.forEach(({ name, now, todo, months, expected }) => {
  test(`computeExpectedBalances: ${name}`, { todo }, (context) => {
    pinClock(context, now)

    assert.deepEqual(toExpectedBalances(computeExpectedBalances(months)), expected)
  })
})

test('computeExpectedBalances keeps the input order and leaves the input months untouched', (context) => {
  pinClock(context, '2026-06-15T12:00')
  const months = [
    createComputedMonth(2026, 6, { isPlanOnly: true, plannedBalanceChange: 50 }),
    createComputedMonth(2026, 4, { startBalance: 900, nextMonthStartBalance: 1000 }),
    createComputedMonth(2026, 5, { startBalance: 1000, plannedBalanceChange: 100 }),
  ]
  const snapshot = structuredClone(months)
  const result = computeExpectedBalances(months)

  assert.deepEqual(result.map(month => [month.monthId, month.expectedBalance]), [
    ['2026-06', 1150],
    ['2026-04', 1000],
    ['2026-05', 1100],
  ])
  assert.deepEqual(months, snapshot)
})

const createYearMonths = (): ComputedMonthData[] => [
  createComputedMonth(2026, 2, {
    startBalance: 1065,
    totalIncome: 600,
    totalExpenses: 200,
    totalOptionalExpenses: 50,
    plannedBalanceChange: 100,
    expectedBalance: 1165,
  }),
  createComputedMonth(2026, 1, {
    startBalance: 1100,
    totalIncome: 700,
    totalExpenses: 400,
    nextMonthStartBalance: 1065,
    calculatedBalanceChange: -35,
    calculatedPocketExpenses: 330,
    currencyProfitLoss: -5,
    totalAllExpenses: 730,
    expectedBalance: 1065,
  }),
  createComputedMonth(2026, 0, {
    startBalance: 1000,
    totalIncome: 500,
    totalExpenses: 300,
    totalOptionalExpenses: 100,
    nextMonthStartBalance: 1100,
    calculatedBalanceChange: 100,
    calculatedPocketExpenses: 120,
    currencyProfitLoss: 20,
    totalAllExpenses: 420,
    plannedBalanceChange: 150,
    plannedVsActualDiff: -50,
    expectedBalance: 1100,
  }),
  createComputedMonth(2025, 11, {
    startBalance: 9000,
    totalIncome: 9000,
    totalExpenses: 9000,
    totalOptionalExpenses: 9000,
    nextMonthStartBalance: 1000,
    calculatedBalanceChange: 9000,
    calculatedPocketExpenses: 9000,
    currencyProfitLoss: 9000,
    totalAllExpenses: 9000,
    plannedBalanceChange: 9000,
    plannedVsActualDiff: 9000,
    expectedBalance: 9000,
  }),
]

const createPlanOnlyApril = (): ComputedMonthData =>
  createComputedMonth(2026, 3, { isPlanOnly: true, plannedBalanceChange: 200, expectedBalance: 1365 })

test('computeYearSummary sums the months of the year and averages each metric over the months that have it', () => {
  assert.deepEqual(computeYearSummary(2026, createYearMonths()), {
    year: 2026,
    monthCount: 3,
    totalStartBalance: 3165,
    totalIncome: 1800,
    totalExpenses: 900,
    totalOptionalExpenses: 150,
    totalBalanceChange: 65,
    totalPocketExpenses: 450,
    totalCurrencyProfitLoss: 15,
    totalAllExpenses: 1150,
    totalPlannedBalanceChange: 250,
    totalPlannedVsActualDiff: -50,
    avgStartBalance: 1055,
    avgIncome: 600,
    avgExpenses: 300,
    avgOptionalExpenses: 50,
    avgBalanceChange: 32.5,
    avgPocketExpenses: 225,
    avgCurrencyProfitLoss: 7.5,
    avgAllExpenses: 575,
    avgPlannedBalanceChange: 125,
    avgPlannedVsActualDiff: -50,
    plannedMonthCount: 2,
    plannedDiffMonthCount: 1,
    endOfYearExpectedBalance: 1165,
  })
})

test('computeYearSummary takes the end-of-year balance from the latest month in any order', () => {
  const [march, february, january] = createYearMonths()

  assert.ok(march && february && january)
  assert.equal(computeYearSummary(2026, [february, march, january]).endOfYearExpectedBalance, 1165)
})

test('computeYearSummary returns zeros and no expected balance for a year without months', () => {
  const { year, endOfYearExpectedBalance, ...totals } = computeYearSummary(2030, createYearMonths())

  assert.deepEqual({ year, endOfYearExpectedBalance }, { year: 2030, endOfYearExpectedBalance: null })
  assert.deepEqual(Object.entries(totals).filter(([, value]) => value !== 0), [])
})

test('computeYearSummary reports zero averages for metrics that no month has', () => {
  const {
    avgStartBalance,
    avgIncome,
    avgBalanceChange,
    avgPocketExpenses,
    avgCurrencyProfitLoss,
    avgAllExpenses,
    avgPlannedBalanceChange,
    avgPlannedVsActualDiff,
  } = computeYearSummary(2026, [createComputedMonth(2026, 8, { startBalance: 1000, totalIncome: 500 })])

  assert.deepEqual(
    {
      avgStartBalance,
      avgIncome,
      avgBalanceChange,
      avgPocketExpenses,
      avgCurrencyProfitLoss,
      avgAllExpenses,
      avgPlannedBalanceChange,
      avgPlannedVsActualDiff,
    },
    {
      avgStartBalance: 1000,
      avgIncome: 500,
      avgBalanceChange: 0,
      avgPocketExpenses: 0,
      avgCurrencyProfitLoss: 0,
      avgAllExpenses: 0,
      avgPlannedBalanceChange: 0,
      avgPlannedVsActualDiff: 0,
    },
  )
})

test('computeYearSummary counts the plans of plan-only months and ends the year at the latest plan', () => {
  const summary = computeYearSummary(2026, [createPlanOnlyApril(), ...createYearMonths()])

  assert.deepEqual(
    {
      avgStartBalance: summary.avgStartBalance,
      avgBalanceChange: summary.avgBalanceChange,
      avgPocketExpenses: summary.avgPocketExpenses,
      avgAllExpenses: summary.avgAllExpenses,
      totalPlannedBalanceChange: summary.totalPlannedBalanceChange,
      plannedMonthCount: summary.plannedMonthCount,
      avgPlannedBalanceChange: summary.avgPlannedBalanceChange,
      endOfYearExpectedBalance: summary.endOfYearExpectedBalance,
    },
    {
      avgStartBalance: 1055,
      avgBalanceChange: 32.5,
      avgPocketExpenses: 225,
      avgAllExpenses: 575,
      totalPlannedBalanceChange: 450,
      plannedMonthCount: 3,
      avgPlannedBalanceChange: 150,
      endOfYearExpectedBalance: 1365,
    },
  )
})

test('computeYearSummary averages income and expenses over real months only', { todo: 'plan-only months dilute income and expense averages in planning mode' }, () => {
  const summary = computeYearSummary(2026, [createPlanOnlyApril(), ...createYearMonths()])

  assert.deepEqual(
    { avgIncome: summary.avgIncome, avgExpenses: summary.avgExpenses, avgOptionalExpenses: summary.avgOptionalExpenses },
    { avgIncome: 600, avgExpenses: 300, avgOptionalExpenses: 50 },
  )
})
