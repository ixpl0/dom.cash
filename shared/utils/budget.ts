import type { BalanceSourceData } from '~~/shared/types/budget'

export const formatAmount = (amount: number, currency: string): string => {
  const formatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency || 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return formatter.format(amount)
}

export const getBalanceChangeClass = (balanceChange: number): string => {
  if (balanceChange > 0) return 'text-success'
  if (balanceChange < 0) return 'text-error'
  return 'text-base-content'
}

export const getPocketExpensesClass = (pocketExpenses: number, income: number): string => {
  const ratio = pocketExpenses / income
  if (ratio > 0.3) return 'text-error'
  if (ratio > 0.2) return 'text-warning'
  return 'text-success'
}

export const calculateTotalBalance = (
  items: BalanceSourceData[],
  baseCurrency: string,
  exchangeRates: Record<string, number>,
): number => {
  return items.reduce((total, item) => {
    if (item.currency === baseCurrency) {
      return total + item.amount
    }

    const rate = exchangeRates[`${item.currency}_${baseCurrency}`] || 1
    return total + (item.amount * rate)
  }, 0)
}
