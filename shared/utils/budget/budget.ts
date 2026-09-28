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

export const convertAmount = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, number>,
): number => {
  if (fromCurrency === toCurrency) {
    return amount
  }

  const fromRate = exchangeRates[fromCurrency] || 1
  const toRate = exchangeRates[toCurrency] || 1

  return (amount / fromRate) * toRate
}

export const calculateTotalBalance = (
  entries: ReadonlyArray<Pick<BudgetEntry, 'amount' | 'currency'>>,
  baseCurrency: string,
  exchangeRates: Record<string, number>,
): number =>
  entries.reduce((total, entry) => total + convertAmount(entry.amount, entry.currency, baseCurrency, exchangeRates), 0)
