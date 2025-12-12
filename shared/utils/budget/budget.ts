import type { BudgetEntry } from '~~/shared/types/budget'
import { formatCurrency, formatCurrencyRounded } from '../shared/currency-formatter'

export const formatAmount = (amount: number, currency: string): string => {
  return formatCurrency(amount, currency)
}

export const formatAmountRounded = (amount: number, currency: string): string => {
  return formatCurrencyRounded(amount, currency)
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
