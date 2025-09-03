import type { MonthData, ComputedMonthData, YearSummary } from '../types/budget'
import { calculateTotalBalance } from './budget'

export const createMonthId = (year: number, month: number): string => {
  return `${year}-${String(month).padStart(2, '0')}`
}

export const parseMonthId = (monthId: string): { year: number, month: number } => {
  const [yearStr, monthStr] = monthId.split('-')
  return {
    year: parseInt(yearStr || '0', 10),
    month: parseInt(monthStr || '0', 10),
  }
}

export const findNextMonth = (monthData: MonthData, allMonths: MonthData[]): MonthData | null => {
  const nextMonth = monthData.month === 11 ? 0 : monthData.month + 1
  const nextYear = monthData.month === 11 ? monthData.year + 1 : monthData.year

  return allMonths.find(m => m.year === nextYear && m.month === nextMonth) || null
}

export const computeMonthData = (
  monthData: MonthData,
  allMonths: MonthData[],
  mainCurrency: string,
  monthNames: string[],
): ComputedMonthData => {
  const monthId = createMonthId(monthData.year, monthData.month)
  const currentMonthRates = monthData.exchangeRates

  const startBalance = calculateTotalBalance(
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

  let nextMonthStartBalance: number | null = null
  let nextMonthBalanceAtCurrentRates: number | null = null

  if (nextMonth) {
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

  const calculatedBalanceChange = nextMonthStartBalance !== null
    ? nextMonthStartBalance - startBalance
    : null

  const currencyProfitLoss = (nextMonthBalanceAtCurrentRates !== null && nextMonthStartBalance !== null)
    ? nextMonthStartBalance - nextMonthBalanceAtCurrentRates
    : null

  const calculatedPocketExpenses = (nextMonthStartBalance !== null && currencyProfitLoss !== null)
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
  }
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
      avgStartBalance: 0,
      avgIncome: 0,
      avgExpenses: 0,
      avgOptionalExpenses: 0,
      avgBalanceChange: 0,
      avgPocketExpenses: 0,
      avgCurrencyProfitLoss: 0,
      avgAllExpenses: 0,
    }
  }

  const totals = yearMonths.reduce((acc, month) => {
    acc.totalStartBalance += month.startBalance
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
    balanceChangeCount: 0,
    pocketExpensesCount: 0,
    currencyProfitLossCount: 0,
    allExpensesCount: 0,
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
    avgStartBalance: totals.totalStartBalance / monthCount,
    avgIncome: totals.totalIncome / monthCount,
    avgExpenses: totals.totalExpenses / monthCount,
    avgOptionalExpenses: totals.totalOptionalExpenses / monthCount,
    avgBalanceChange: totals.balanceChangeCount > 0 ? totals.totalBalanceChange / totals.balanceChangeCount : 0,
    avgPocketExpenses: totals.pocketExpensesCount > 0 ? totals.totalPocketExpenses / totals.pocketExpensesCount : 0,
    avgCurrencyProfitLoss: totals.currencyProfitLossCount > 0 ? totals.totalCurrencyProfitLoss / totals.currencyProfitLossCount : 0,
    avgAllExpenses: totals.allExpensesCount > 0 ? totals.totalAllExpenses / totals.allExpensesCount : 0,
  }
}
