import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { resolveBudget, type BudgetOwner } from '~~/server/services/budget/access'
import { getAvailableYears, loadMonths } from '~~/server/services/budget/months'
import { getUserPlans } from '~~/server/services/budget/plans'
import { defineMcpTool, toolError, toolResult, type McpContext } from '~~/server/services/mcp/tool-definition'
import { usernameSchema } from '~~/shared/schemas/common'
import type { BudgetAccess, ComputedMonthData, MonthData, PlanData, SavedEntry, YearInfo, YearSummary } from '~~/shared/types/budget'
import { convertAmount } from '~~/shared/utils/budget/budget'
import { computeExpectedBalances, computeMonthData, computeYearSummary } from '~~/shared/utils/budget/budget-calculations'
import { fromMonthNumber, toMonthNumber, type MonthPosition } from '~~/shared/utils/budget/month-helpers'
import { getCurrencyFractionDigits } from '~~/shared/utils/shared/currency-formatter'

const DEFAULT_RANGE_MONTHS = 12
const MAX_RANGE_MONTHS = 120
const CALENDAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

interface LoadedBudget {
  owner: BudgetOwner
  access: BudgetAccess
  plans: PlanData[]
  latestRecordedMonth: number | null
}

interface MonthRange {
  fromMonth: number
  toMonth: number
}

const usernameInput = usernameSchema
  .optional()
  .describe('Email of the owner of a budget shared with the user; omit for the user\'s own budget')

const calendarMonthInput = (description: string) =>
  z.string().regex(CALENDAR_MONTH_PATTERN, 'Expected YYYY-MM').optional().describe(description)

const parseCalendarMonth = (value: string): number => {
  const [year = 0, month = 1] = value.split('-').map(Number)
  return toMonthNumber({ year, month: month - 1 })
}

const formatCalendarMonth = ({ year, month }: MonthPosition): string =>
  `${year}-${String(month + 1).padStart(2, '0')}`

const roundAmount = (value: number, currency: string): number => {
  const factor = 10 ** getCurrencyFractionDigits(currency)
  const rounded = Math.round(value * factor) / factor
  return rounded === 0 ? 0 : rounded
}

const roundNullableAmount = (value: number | null, currency: string): number | null =>
  value === null ? null : roundAmount(value, currency)

const findLatestRecordedMonth = ([latestYear]: readonly YearInfo[]): number | null => {
  const latestMonth = latestYear?.months.at(-1)
  return latestYear && latestMonth !== undefined ? toMonthNumber({ year: latestYear.year, month: latestMonth }) : null
}

const findLatestKnownMonth = ({ plans, latestRecordedMonth }: LoadedBudget): number | null => {
  const knownMonths = [...plans.map(toMonthNumber), ...(latestRecordedMonth === null ? [] : [latestRecordedMonth])]
  return knownMonths.length > 0 ? Math.max(...knownMonths) : null
}

const loadBudget = async ({ event, user: viewer }: McpContext, username: string | undefined): Promise<LoadedBudget> => {
  const { owner, access } = await resolveBudget(event, viewer, username, 'read')
  const [availableYears, plans] = await Promise.all([
    getAvailableYears(owner.id, event),
    access === 'read' ? Promise.resolve<PlanData[]>([]) : getUserPlans(owner.id, event),
  ])

  return { owner, access, plans, latestRecordedMonth: findLatestRecordedMonth(availableYears) }
}

const listBudgetsSharedWithViewer = ({ event, user: viewer }: McpContext) =>
  useDatabase(event)
    .select({ owner: user.username, access: budgetShare.access })
    .from(budgetShare)
    .innerJoin(user, eq(budgetShare.ownerId, user.id))
    .where(eq(budgetShare.sharedWithId, viewer.id))

const createPlanOnlyMonth = ({ year, month }: PlanData): MonthData => ({
  id: `plan-only-${year}-${month}`,
  year,
  month,
  balanceSources: [],
  incomeEntries: [],
  expenseEntries: [],
  exchangeRates: {},
  exchangeRatesSource: '',
  isPlanOnly: true,
})

const listYearsAround = ({ fromMonth, toMonth }: MonthRange): number[] => {
  const firstYear = fromMonthNumber(fromMonth).year - 1
  const lastYear = fromMonthNumber(toMonth).year + 1
  return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index)
}

const computeBudgetMonths = async ({ owner, plans }: LoadedBudget, range: MonthRange, event: H3Event): Promise<ComputedMonthData[]> => {
  const years = listYearsAround(range)
  const recordedMonths = await loadMonths(owner.id, years, event)
  const recordedMonthNumbers = new Set(recordedMonths.map(toMonthNumber))
  const planOnlyMonths = plans
    .filter(plan => years.includes(plan.year) && !recordedMonthNumbers.has(toMonthNumber(plan)))
    .map(createPlanOnlyMonth)
  const allMonths = [...recordedMonths, ...planOnlyMonths]
  const planByMonth = new Map(plans.map(plan => [toMonthNumber(plan), plan]))

  const computedMonths = allMonths.map((monthData) => {
    const plan = planByMonth.get(toMonthNumber(monthData))
    return computeMonthData(monthData, allMonths, owner.mainCurrency, [], plan?.plannedBalanceChange ?? null, plan?.comment ?? null)
  })

  return computeExpectedBalances(computedMonths)
    .filter(monthData => toMonthNumber(monthData) >= range.fromMonth && toMonthNumber(monthData) <= range.toMonth)
    .sort((first, second) => toMonthNumber(first) - toMonthNumber(second))
}

const toPlanTotals = (monthData: ComputedMonthData, currency: string) => ({
  balanceChange: monthData.plannedBalanceChange,
  ...(monthData.planComment ? { comment: monthData.planComment } : {}),
  expectedBalance: roundNullableAmount(monthData.expectedBalance, currency),
  ...(monthData.plannedVsActualDiff === null ? {} : { difference: roundAmount(monthData.plannedVsActualDiff, currency) }),
})

const toMonthTotals = (monthData: ComputedMonthData, currency: string) => {
  const month = formatCalendarMonth(monthData)
  const money = (value: number | null): number | null => roundNullableAmount(value, currency)
  const hasPlan = monthData.plannedBalanceChange !== null || monthData.planComment !== null
  const plan = hasPlan ? { plan: toPlanTotals(monthData, currency) } : {}

  if (monthData.isPlanOnly) {
    return { month, planOnly: true, ...plan }
  }

  return {
    month,
    startBalance: money(monthData.startBalance),
    income: money(monthData.totalIncome),
    expenses: money(monthData.totalExpenses),
    optionalExpenses: money(monthData.totalOptionalExpenses),
    pocketExpenses: money(monthData.calculatedPocketExpenses),
    allExpenses: money(monthData.totalAllExpenses),
    currencyFluctuations: money(monthData.currencyProfitLoss),
    balanceChange: money(monthData.calculatedBalanceChange),
    ...(monthData.missingRateCurrencies.length > 0 ? { missingRates: monthData.missingRateCurrencies } : {}),
    ...plan,
  }
}

const toYearTotals = (summary: YearSummary, currency: string) => {
  const money = (value: number): number => roundAmount(value, currency)

  return {
    year: summary.year,
    months: summary.monthCount,
    income: money(summary.totalIncome),
    expenses: money(summary.totalExpenses),
    pocketExpenses: money(summary.totalPocketExpenses),
    allExpenses: money(summary.totalAllExpenses),
    currencyFluctuations: money(summary.totalCurrencyProfitLoss),
    balanceChange: money(summary.totalBalanceChange),
    averageIncome: money(summary.avgIncome),
    averageAllExpenses: money(summary.avgAllExpenses),
    averageBalanceChange: money(summary.avgBalanceChange),
    ...(summary.plannedMonthCount > 0
      ? {
          plannedBalanceChange: summary.totalPlannedBalanceChange,
          expectedYearEndBalance: roundNullableAmount(summary.endOfYearExpectedBalance, currency),
        }
      : {}),
  }
}

const toEntryLine = ({ description, amount, currency, date, isOptional }: SavedEntry, { exchangeRates }: MonthData, mainCurrency: string) => ({
  description,
  amount,
  currency,
  ...(currency === mainCurrency
    ? {}
    : { inMainCurrency: roundAmount(convertAmount(amount, currency, mainCurrency, exchangeRates), mainCurrency) }),
  ...(date ? { date } : {}),
  ...(isOptional ? { optional: true } : {}),
})

const resolveSummaryRange = (budget: LoadedBudget, from: string | undefined, to: string | undefined): MonthRange | null => {
  const latestKnownMonth = findLatestKnownMonth(budget)

  if (from === undefined && to === undefined) {
    if (latestKnownMonth === null) {
      return null
    }
    const fromMonth = (budget.latestRecordedMonth ?? latestKnownMonth) - DEFAULT_RANGE_MONTHS + 1
    return { fromMonth, toMonth: Math.min(latestKnownMonth, fromMonth + MAX_RANGE_MONTHS - 1) }
  }

  const toMonth = to === undefined ? latestKnownMonth : parseCalendarMonth(to)

  if (toMonth === null) {
    return null
  }

  return { fromMonth: from === undefined ? toMonth - DEFAULT_RANGE_MONTHS + 1 : parseCalendarMonth(from), toMonth }
}

const listYears = (months: readonly ComputedMonthData[]): number[] =>
  [...new Set(months.map(({ year }) => year))].sort((first, second) => first - second)

export const getBudgetSummaryTool = defineMcpTool({
  name: 'get_budget_summary',
  title: 'Budget summary',
  description: 'Monthly totals of a dom.cash budget in its main currency. startBalance: savings on the first day of the month; '
    + 'balanceChange: next month\'s startBalance minus this one; pocketExpenses: spending that was not recorded, derived from the balances; '
    + 'allExpenses = expenses + pocketExpenses. A null value needs the next month\'s balances. '
    + 'Without from and to: the latest 12 recorded months and the planned months after them.',
  scope: 'budget',
  input: z.object({
    username: usernameInput,
    from: calendarMonthInput('First month, YYYY-MM'),
    to: calendarMonthInput('Last month, YYYY-MM'),
  }),
  run: async ({ username, from, to }, context) => {
    const [budget, sharedBudgets] = await Promise.all([loadBudget(context, username), listBudgetsSharedWithViewer(context)])
    const range = resolveSummaryRange(budget, from, to)

    if (range && to !== undefined && range.fromMonth > range.toMonth) {
      return toolError('from must not be later than to')
    }

    if (range && range.toMonth - range.fromMonth + 1 > MAX_RANGE_MONTHS) {
      return toolError(`The range must not be longer than ${MAX_RANGE_MONTHS} months`)
    }

    const months = range && range.fromMonth <= range.toMonth ? await computeBudgetMonths(budget, range, context.event) : []
    const { username: owner, mainCurrency } = budget.owner

    return toolResult({
      owner,
      mainCurrency,
      access: budget.access,
      months: months.map(monthData => toMonthTotals(monthData, mainCurrency)),
      years: listYears(months).map(year => toYearTotals(computeYearSummary(year, months), mainCurrency)),
      ...(sharedBudgets.length > 0 ? { budgetsSharedWithUser: sharedBudgets } : {}),
    })
  },
})

export const getBudgetMonthTool = defineMcpTool({
  name: 'get_budget_month',
  title: 'Budget month',
  description: 'One month of a dom.cash budget: the accounts that make up its start balance, the incomes and the expenses '
    + 'in their own currencies, and the month totals in the main currency. Without month: the latest recorded month.',
  scope: 'budget',
  input: z.object({
    username: usernameInput,
    month: calendarMonthInput('Month, YYYY-MM'),
  }),
  run: async ({ username, month }, context) => {
    const budget = await loadBudget(context, username)
    const monthNumber = month === undefined ? budget.latestRecordedMonth : parseCalendarMonth(month)

    if (monthNumber === null) {
      return toolError('The budget has no months yet')
    }

    const [monthData] = await computeBudgetMonths(budget, { fromMonth: monthNumber, toMonth: monthNumber }, context.event)

    if (!monthData) {
      return toolError(`The budget has no data for ${formatCalendarMonth(fromMonthNumber(monthNumber))}`)
    }

    const { username: owner, mainCurrency } = budget.owner

    return toolResult({
      owner,
      mainCurrency,
      access: budget.access,
      totals: toMonthTotals(monthData, mainCurrency),
      balances: monthData.balanceSources.map(entry => toEntryLine(entry, monthData, mainCurrency)),
      incomes: monthData.incomeEntries.map(entry => toEntryLine(entry, monthData, mainCurrency)),
      expenses: monthData.expenseEntries.map(entry => toEntryLine(entry, monthData, mainCurrency)),
    })
  },
})
