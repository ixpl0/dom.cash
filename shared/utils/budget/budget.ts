import type { BudgetEntry } from '~~/shared/types/budget'

const hasValidRate = (exchangeRates: Record<string, number>, currency: string): boolean => {
  const rate = exchangeRates[currency]
  return rate !== undefined && Number.isFinite(rate) && rate > 0
}

export const findCurrenciesWithoutRate = (
  entries: BudgetEntry[],
  baseCurrency: string,
  exchangeRates: Record<string, number>,
): string[] => {
  const foreignCurrencies = [...new Set(entries.map(entry => entry.currency))]
    .filter(currency => currency !== baseCurrency)
  const requiredCurrencies = foreignCurrencies.length > 0 ? [...foreignCurrencies, baseCurrency] : []

  return requiredCurrencies.filter(currency => !hasValidRate(exchangeRates, currency))
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
