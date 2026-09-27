import { CURRENCY_CODES } from './currencies'

const SYMBOL_LOCALE = 'en'

const formatterCache = new Map<string, Intl.NumberFormat>()
const narrowSymbolCache = new Map<string, string>()
const sharedNarrowSymbolCache = new Map<'symbols', ReadonlySet<string>>()

const getFormatter = (locale: string, currency: string, maxFractionDigits: number): Intl.NumberFormat => {
  const key = `${locale}-${currency}-${maxFractionDigits}`
  const cached = formatterCache.get(key)

  if (cached) {
    return cached
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  })

  formatterCache.set(key, formatter)
  return formatter
}

const getNarrowSymbol = (currency: string): string => {
  const cached = narrowSymbolCache.get(currency)

  if (cached) {
    return cached
  }

  const symbol = new Intl.NumberFormat(SYMBOL_LOCALE, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    .formatToParts(0)
    .find(part => part.type === 'currency')
    ?.value ?? currency

  narrowSymbolCache.set(currency, symbol)
  return symbol
}

const getSharedNarrowSymbols = (): ReadonlySet<string> => {
  const cached = sharedNarrowSymbolCache.get('symbols')

  if (cached) {
    return cached
  }

  const symbolCounts = CURRENCY_CODES
    .map(getNarrowSymbol)
    .reduce((counts, symbol) => counts.set(symbol, (counts.get(symbol) ?? 0) + 1), new Map<string, number>())
  const sharedSymbols = new Set([...symbolCounts].filter(([, count]) => count > 1).map(([symbol]) => symbol))

  sharedNarrowSymbolCache.set('symbols', sharedSymbols)
  return sharedSymbols
}

const getDistinctNarrowSymbol = (currency: string): string | null => {
  const symbol = getNarrowSymbol(currency)
  return symbol !== currency && !getSharedNarrowSymbols().has(symbol) ? symbol : null
}

const isShownAsZero = (amount: number, maxFractionDigits: number): boolean =>
  Math.abs(amount) < 0.5 / 10 ** maxFractionDigits

const replaceCurrencyCode = (parts: Intl.NumberFormatPart[], currency: string, symbol: string): string =>
  parts
    .map((part, index) => {
      const isCurrencyCode = part.type === 'currency' && part.value === currency
      const previousPart = parts[index - 1]
      const followsCurrencyCode = part.type === 'literal'
        && previousPart?.type === 'currency'
        && previousPart.value === currency

      if (isCurrencyCode) {
        return symbol
      }
      if (followsCurrencyCode) {
        return part.value.trim()
      }
      return part.value
    })
    .join('')

export const formatCurrency = (
  amount: number,
  currency: string,
  locale: string,
  options?: { rounded?: boolean },
): string => {
  const maxFractionDigits = options?.rounded ? 0 : 2
  const value = isShownAsZero(amount, maxFractionDigits) ? 0 : amount
  const parts = getFormatter(locale, currency, maxFractionDigits).formatToParts(value)
  const symbol = getDistinctNarrowSymbol(currency)

  return symbol === null
    ? parts.map(part => part.value).join('')
    : replaceCurrencyCode(parts, currency, symbol)
}

export const formatCurrencyRounded = (amount: number, currency: string, locale: string): string =>
  formatCurrency(amount, currency, locale, { rounded: true })
