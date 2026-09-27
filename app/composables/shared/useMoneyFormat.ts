import { formatCurrency, formatCurrencyRounded } from '~~/shared/utils/shared/currency-formatter'

export const useMoneyFormat = () => {
  const { locale } = useI18n()

  const formatMoney = (amount: number, currency: string): string =>
    formatCurrency(amount, currency, locale.value)

  const formatMoneyRounded = (amount: number, currency: string): string =>
    formatCurrencyRounded(amount, currency, locale.value)

  return {
    formatMoney,
    formatMoneyRounded,
  }
}
