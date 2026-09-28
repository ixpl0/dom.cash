import { CURRENCY_CODES, type CurrencyOption } from '~~/shared/utils/shared/currencies'

export const useCurrencies = () => {
  const { t } = useI18n()

  const getCurrencyName = (code: string): string => {
    const translationKey = `currencies.${code}`
    const translation = t(translationKey)
    return translation !== translationKey ? translation : code
  }

  const getCurrencyOptions = (recentCurrencies: string[] = []): CurrencyOption[] => {
    const allOptions: CurrencyOption[] = CURRENCY_CODES.map(code => ({
      code,
      name: getCurrencyName(code),
    }))

    if (recentCurrencies.length === 0) {
      return allOptions
    }

    const recentOptions = allOptions
      .filter(option => recentCurrencies.includes(option.code))
      .sort((first, second) => recentCurrencies.indexOf(first.code) - recentCurrencies.indexOf(second.code))
    const remainingOptions = allOptions.filter(option => !recentCurrencies.includes(option.code))

    return [...recentOptions, ...remainingOptions]
  }

  const filterCurrencies = (query: string, recentCurrencies: string[] = []): CurrencyOption[] => {
    const searchQuery = query.toLowerCase().trim()
    const options = getCurrencyOptions(recentCurrencies)

    if (!searchQuery) {
      return options
    }

    return options.filter(currency =>
      currency.code.toLowerCase().includes(searchQuery)
      || currency.name.toLowerCase().includes(searchQuery),
    )
  }

  return {
    getCurrencyName,
    getCurrencyOptions,
    filterCurrencies,
  }
}
