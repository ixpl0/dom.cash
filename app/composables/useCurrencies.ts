import { CURRENCY_CODES, type CurrencyOption } from '~~/shared/utils/currencies'

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

    const recentOptions: CurrencyOption[] = []
    const remainingOptions: CurrencyOption[] = []

    for (const option of allOptions) {
      if (recentCurrencies.includes(option.code)) {
        recentOptions.push(option)
      }
      else {
        remainingOptions.push(option)
      }
    }

    recentOptions.sort((a, b) =>
      recentCurrencies.indexOf(a.code) - recentCurrencies.indexOf(b.code),
    )

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
