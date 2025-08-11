import type { BudgetEntry } from '~~/shared/types/budget'

export const formatAmount = (amount: number, currency: string): string => {
  const formatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  return formatter.format(amount)
}

export const calculateTotalBalance = (
  entries: BudgetEntry[],
  baseCurrency: string,
  exchangeRates: Record<string, number>,
): number => {
  if (!entries?.length) {
    return 0
  }

  return entries.reduce((total, entry) => {
    if (entry.currency === baseCurrency) {
      return total + entry.amount
    }

    const fromRate = exchangeRates[entry.currency] || 1
    const toRate = exchangeRates[baseCurrency] || 1

    return total + (entry.amount / fromRate) * toRate
  }, 0)
}

export const getBalanceChangeClass = (balanceChange: number): string => {
  if (balanceChange > 0) return 'text-success'
  if (balanceChange < 0) return 'text-error'
  return 'text-base-content'
}

export const getPocketExpensesClass = (pocketExpenses: number, income: number): string => {
  const ratio = income > 0 ? pocketExpenses / income : 0

  if (ratio > 0.5) return 'text-error'
  if (ratio > 0.3) return 'text-warning'
  return 'text-success'
}
