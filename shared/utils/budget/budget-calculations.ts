import type { MonthData, ComputedMonthData, YearSummary } from '../../types/budget'
import { calculateTotalBalance, findCurrenciesWithoutRate } from './budget'
import { isPastMonth } from './month-helpers'

export const createMonthKey = (year: number, month: number): string => {
  return `${year}-${String(month).padStart(2, '0')}`
}

const findNextMonth = (monthData: MonthData, allMonths: MonthData[]): MonthData | null => {
  const nextMonth = monthData.month === 11 ? 0 : monthData.month + 1
  const nextYear = monthData.month === 11 ? monthData.year + 1 : monthData.year

  return allMonths.find(m => m.year === nextYear && m.month === nextMonth) || null
}

export const computeMonthData = (
  monthData: MonthData,
  allMonths: MonthData[],
  mainCurrency: string,
  monthNames: string[],
  plannedBalanceChange: number | null = null,
  planComment: string | null = null,
): ComputedMonthData => {
  const monthKey = createMonthKey(monthData.year, monthData.month)
  const currentMonthRates = monthData.exchangeRates
  const isPlanOnly = monthData.isPlanOnly === true

  const startBalance = isPlanOnly
    ? null
    : calculateTotalBalance(
        monthData.balanceSources,
        mainCurrency,
        currentMonthRates,
      )

  const totalIncome = calculateTotalBalance(
    monthData.incomeEntries,
    mainCurrency,
    currentMonthRates,
  )

  const totalExpenses = calculateTotalBalance(
    monthData.expenseEntries,
    mainCurrency,
    currentMonthRates,
  )

  const totalOptionalExpenses = calculateTotalBalance(
    monthData.expenseEntries.filter(entry => entry.isOptional),
    mainCurrency,
    currentMonthRates,
  )

  const nextMonth = findNextMonth(monthData, allMonths)
  const nextIsPlanOnly = nextMonth?.isPlanOnly === true

  let nextMonthStartBalance: number | null = null
  let nextMonthBalanceAtCurrentRates: number | null = null

  if (nextMonth && !nextIsPlanOnly) {
    const nextMonthRates = nextMonth.exchangeRates

    nextMonthStartBalance = calculateTotalBalance(
      nextMonth.balanceSources,
      mainCurrency,
      nextMonthRates,
    )

    nextMonthBalanceAtCurrentRates = calculateTotalBalance(
      nextMonth.balanceSources,
      mainCurrency,
      currentMonthRates,
    )
  }

  const calculatedBalanceChange = (!isPlanOnly && nextMonthStartBalance !== null && startBalance !== null)
    ? nextMonthStartBalance - startBalance
    : null

  const currencyProfitLoss = (!isPlanOnly && nextMonthBalanceAtCurrentRates !== null && nextMonthStartBalance !== null)
    ? nextMonthStartBalance - nextMonthBalanceAtCurrentRates
    : null

  const calculatedPocketExpenses = (!isPlanOnly && nextMonthStartBalance !== null && currencyProfitLoss !== null && startBalance !== null)
    ? startBalance + totalIncome + currencyProfitLoss - nextMonthStartBalance - totalExpenses
    : null

  const totalAllExpenses = calculatedPocketExpenses !== null
    ? totalExpenses + calculatedPocketExpenses
    : null

  const nextMonthBalancesAtCurrentRates = nextMonth && !nextIsPlanOnly ? nextMonth.balanceSources : []
  const missingRateCurrencies = isPlanOnly
    ? []
    : findCurrenciesWithoutRate(
        [...monthData.balanceSources, ...monthData.incomeEntries, ...monthData.expenseEntries, ...nextMonthBalancesAtCurrentRates],
        mainCurrency,
        currentMonthRates,
      ).sort()

  const currentMonthDate = `${monthData.year}-${String(monthData.month + 1).padStart(2, '0')}-01`
  const isUsingOtherMonthRates = monthData.exchangeRatesSource !== currentMonthDate

  let sourceMonthTitle = ''
  if (isUsingOtherMonthRates) {
    if (monthData.exchangeRatesSource === 'default') {
      sourceMonthTitle = 'Базовые курсы (USD = 1)'
    }
    else {
      const parts = monthData.exchangeRatesSource.split('-')
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const year = parts[0]
        const month = parts[1]
        const monthIndex = parseInt(month, 10) - 1

        if (!isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
          sourceMonthTitle = `${monthNames[monthIndex]} ${year}`
        }
      }
    }
  }

  const plannedVsActualDiff = (
    plannedBalanceChange !== null
    && calculatedBalanceChange !== null
    && isPastMonth(monthData.year, monthData.month)
  )
    ? calculatedBalanceChange - plannedBalanceChange
    : null

  return {
    ...monthData,
    monthKey,
    startBalance,
    totalIncome,
    totalExpenses,
    totalOptionalExpenses,
    calculatedBalanceChange,
    calculatedPocketExpenses,
    currencyProfitLoss,
    totalAllExpenses,
    nextMonthStartBalance,
    isUsingOtherMonthRates,
    sourceMonthTitle,
    missingRateCurrencies,
    plannedBalanceChange,
    plannedVsActualDiff,
    expectedBalance: null,
    planComment,
  }
}

export const computeExpectedBalances = (
  computedMonths: ComputedMonthData[],
): ComputedMonthData[] => {
  const sortedAsc = [...computedMonths].sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year
    }
    return a.month - b.month
  })

  const withExpected = sortedAsc.reduce<{ running: number | null, previousMonthOrdinal: number | null, list: ComputedMonthData[] }>(
    (acc, monthItem) => {
      const monthIsPast = isPastMonth(monthItem.year, monthItem.month)
      const monthOrdinal = monthItem.year * 12 + monthItem.month
      const followsPreviousMonth = acc.previousMonthOrdinal !== null && monthOrdinal - acc.previousMonthOrdinal === 1

      const nextRunning = (() => {
        if (monthIsPast && monthItem.nextMonthStartBalance !== null) {
          return monthItem.nextMonthStartBalance
        }
        if (monthIsPast) {
          return monthItem.startBalance
        }
        const anchor = followsPreviousMonth
          ? acc.running ?? monthItem.startBalance ?? 0
          : monthItem.startBalance ?? acc.running ?? 0
        const planned = monthItem.plannedBalanceChange ?? 0
        return anchor + planned
      })()

      return {
        running: nextRunning,
        previousMonthOrdinal: monthOrdinal,
        list: [...acc.list, { ...monthItem, expectedBalance: nextRunning }],
      }
    },
    { running: null, previousMonthOrdinal: null, list: [] },
  )

  const expectedByKey = new Map(withExpected.list.map(item => [item.monthKey, item.expectedBalance]))

  return computedMonths.map(monthItem => ({
    ...monthItem,
    expectedBalance: expectedByKey.get(monthItem.monthKey) ?? null,
  }))
}

const sumOf = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0)

const averageOf = (values: readonly number[]): number =>
  values.length > 0 ? sumOf(values) / values.length : 0

const collectValues = (
  months: readonly ComputedMonthData[],
  selectValue: (month: ComputedMonthData) => number | null,
): number[] => months.map(selectValue).filter((value): value is number => value !== null)

const findLatestMonth = (months: readonly ComputedMonthData[]): ComputedMonthData | undefined =>
  months.reduce<ComputedMonthData | undefined>(
    (latest, candidate) => (!latest || candidate.month > latest.month ? candidate : latest),
    undefined,
  )

export const computeYearSummary = (
  year: number,
  monthsData: ComputedMonthData[],
): YearSummary => {
  const yearMonths = monthsData.filter(month => month.year === year)
  const realMonths = yearMonths.filter(month => !month.isPlanOnly)

  const startBalances = collectValues(yearMonths, month => month.startBalance)
  const incomes = realMonths.map(month => month.totalIncome)
  const expenses = realMonths.map(month => month.totalExpenses)
  const optionalExpenses = realMonths.map(month => month.totalOptionalExpenses)
  const balanceChanges = collectValues(yearMonths, month => month.calculatedBalanceChange)
  const pocketExpenses = collectValues(yearMonths, month => month.calculatedPocketExpenses)
  const currencyProfitLosses = collectValues(yearMonths, month => month.currencyProfitLoss)
  const allExpenses = collectValues(yearMonths, month => month.totalAllExpenses)
  const plannedBalanceChanges = collectValues(yearMonths, month => month.plannedBalanceChange)
  const plannedVsActualDiffs = collectValues(yearMonths, month => month.plannedVsActualDiff)

  return {
    year,
    monthCount: yearMonths.length,
    totalStartBalance: sumOf(startBalances),
    totalIncome: sumOf(incomes),
    totalExpenses: sumOf(expenses),
    totalOptionalExpenses: sumOf(optionalExpenses),
    totalBalanceChange: sumOf(balanceChanges),
    totalPocketExpenses: sumOf(pocketExpenses),
    totalCurrencyProfitLoss: sumOf(currencyProfitLosses),
    totalAllExpenses: sumOf(allExpenses),
    totalPlannedBalanceChange: sumOf(plannedBalanceChanges),
    totalPlannedVsActualDiff: sumOf(plannedVsActualDiffs),
    avgStartBalance: averageOf(startBalances),
    avgIncome: averageOf(incomes),
    avgExpenses: averageOf(expenses),
    avgOptionalExpenses: averageOf(optionalExpenses),
    avgBalanceChange: averageOf(balanceChanges),
    avgPocketExpenses: averageOf(pocketExpenses),
    avgCurrencyProfitLoss: averageOf(currencyProfitLosses),
    avgAllExpenses: averageOf(allExpenses),
    avgPlannedBalanceChange: averageOf(plannedBalanceChanges),
    avgPlannedVsActualDiff: averageOf(plannedVsActualDiffs),
    plannedMonthCount: plannedBalanceChanges.length,
    plannedDiffMonthCount: plannedVsActualDiffs.length,
    endOfYearExpectedBalance: findLatestMonth(yearMonths)?.expectedBalance ?? null,
  }
}
