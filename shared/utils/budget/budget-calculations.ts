import type { MonthData, ComputedMonthData, YearSummary } from '../../types/budget'
import { calculateTotalBalance } from './budget'
import { isPastMonth } from './month-helpers'

export const createMonthId = (year: number, month: number): string => {
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
  const monthId = createMonthId(monthData.year, monthData.month)
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
    monthId,
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

  const withExpected = sortedAsc.reduce<{ running: number | null, list: ComputedMonthData[] }>(
    (acc, monthItem) => {
      const monthIsPast = isPastMonth(monthItem.year, monthItem.month)

      const nextRunning = (() => {
        if (monthIsPast && monthItem.nextMonthStartBalance !== null) {
          return monthItem.nextMonthStartBalance
        }
        if (monthIsPast) {
          return monthItem.startBalance
        }
        const anchor = acc.running ?? monthItem.startBalance ?? 0
        const planned = monthItem.plannedBalanceChange ?? 0
        return anchor + planned
      })()

      return {
        running: nextRunning,
        list: [...acc.list, { ...monthItem, expectedBalance: nextRunning }],
      }
    },
    { running: null, list: [] },
  )

  const expectedById = new Map(withExpected.list.map(item => [item.monthId, item.expectedBalance]))

  return computedMonths.map(monthItem => ({
    ...monthItem,
    expectedBalance: expectedById.get(monthItem.monthId) ?? null,
  }))
}

export const computeYearSummary = (
  year: number,
  monthsData: ComputedMonthData[],
): YearSummary => {
  const yearMonths = monthsData.filter(m => m.year === year)
  const monthCount = yearMonths.length

  if (monthCount === 0) {
    return {
      year,
      monthCount: 0,
      totalStartBalance: 0,
      totalIncome: 0,
      totalExpenses: 0,
      totalOptionalExpenses: 0,
      totalBalanceChange: 0,
      totalPocketExpenses: 0,
      totalCurrencyProfitLoss: 0,
      totalAllExpenses: 0,
      totalPlannedBalanceChange: 0,
      totalPlannedVsActualDiff: 0,
      avgStartBalance: 0,
      avgIncome: 0,
      avgExpenses: 0,
      avgOptionalExpenses: 0,
      avgBalanceChange: 0,
      avgPocketExpenses: 0,
      avgCurrencyProfitLoss: 0,
      avgAllExpenses: 0,
      avgPlannedBalanceChange: 0,
      avgPlannedVsActualDiff: 0,
      plannedMonthCount: 0,
      plannedDiffMonthCount: 0,
      endOfYearExpectedBalance: null,
    }
  }

  const latestMonthOfYear = yearMonths.reduce(
    (latest, candidate) => (candidate.month > latest.month ? candidate : latest),
    yearMonths[0]!,
  )
  const endOfYearExpectedBalance = latestMonthOfYear.expectedBalance

  const totals = yearMonths.reduce((acc, month) => {
    if (month.startBalance !== null) {
      acc.totalStartBalance += month.startBalance
      acc.startBalanceCount++
    }
    acc.totalIncome += month.totalIncome
    acc.totalExpenses += month.totalExpenses
    acc.totalOptionalExpenses += month.totalOptionalExpenses

    if (month.calculatedBalanceChange !== null) {
      acc.totalBalanceChange += month.calculatedBalanceChange
      acc.balanceChangeCount++
    }

    if (month.calculatedPocketExpenses !== null) {
      acc.totalPocketExpenses += month.calculatedPocketExpenses
      acc.pocketExpensesCount++
    }

    if (month.currencyProfitLoss !== null) {
      acc.totalCurrencyProfitLoss += month.currencyProfitLoss
      acc.currencyProfitLossCount++
    }

    if (month.totalAllExpenses !== null) {
      acc.totalAllExpenses += month.totalAllExpenses
      acc.allExpensesCount++
    }

    if (month.plannedBalanceChange !== null) {
      acc.totalPlannedBalanceChange += month.plannedBalanceChange
      acc.plannedMonthCount++
    }

    if (month.plannedVsActualDiff !== null) {
      acc.totalPlannedVsActualDiff += month.plannedVsActualDiff
      acc.plannedDiffMonthCount++
    }

    return acc
  }, {
    totalStartBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalOptionalExpenses: 0,
    totalBalanceChange: 0,
    totalPocketExpenses: 0,
    totalCurrencyProfitLoss: 0,
    totalAllExpenses: 0,
    totalPlannedBalanceChange: 0,
    totalPlannedVsActualDiff: 0,
    startBalanceCount: 0,
    balanceChangeCount: 0,
    pocketExpensesCount: 0,
    currencyProfitLossCount: 0,
    allExpensesCount: 0,
    plannedMonthCount: 0,
    plannedDiffMonthCount: 0,
  })

  return {
    year,
    monthCount,
    totalStartBalance: totals.totalStartBalance,
    totalIncome: totals.totalIncome,
    totalExpenses: totals.totalExpenses,
    totalOptionalExpenses: totals.totalOptionalExpenses,
    totalBalanceChange: totals.totalBalanceChange,
    totalPocketExpenses: totals.totalPocketExpenses,
    totalCurrencyProfitLoss: totals.totalCurrencyProfitLoss,
    totalAllExpenses: totals.totalAllExpenses,
    totalPlannedBalanceChange: totals.totalPlannedBalanceChange,
    totalPlannedVsActualDiff: totals.totalPlannedVsActualDiff,
    avgStartBalance: totals.startBalanceCount > 0 ? totals.totalStartBalance / totals.startBalanceCount : 0,
    avgIncome: totals.totalIncome / monthCount,
    avgExpenses: totals.totalExpenses / monthCount,
    avgOptionalExpenses: totals.totalOptionalExpenses / monthCount,
    avgBalanceChange: totals.balanceChangeCount > 0 ? totals.totalBalanceChange / totals.balanceChangeCount : 0,
    avgPocketExpenses: totals.pocketExpensesCount > 0 ? totals.totalPocketExpenses / totals.pocketExpensesCount : 0,
    avgCurrencyProfitLoss: totals.currencyProfitLossCount > 0 ? totals.totalCurrencyProfitLoss / totals.currencyProfitLossCount : 0,
    avgAllExpenses: totals.allExpensesCount > 0 ? totals.totalAllExpenses / totals.allExpensesCount : 0,
    avgPlannedBalanceChange: totals.plannedMonthCount > 0 ? totals.totalPlannedBalanceChange / totals.plannedMonthCount : 0,
    avgPlannedVsActualDiff: totals.plannedDiffMonthCount > 0 ? totals.totalPlannedVsActualDiff / totals.plannedDiffMonthCount : 0,
    plannedMonthCount: totals.plannedMonthCount,
    plannedDiffMonthCount: totals.plannedDiffMonthCount,
    endOfYearExpectedBalance,
  }
}
