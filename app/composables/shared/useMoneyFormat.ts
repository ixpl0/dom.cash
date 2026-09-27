import { formatCurrency, formatCurrencyRounded, getShownSign } from '~~/shared/utils/shared/currency-formatter'

export const useMoneyFormat = () => {
  const { locale } = useI18n()

  const formatMoney = (amount: number, currency: string): string =>
    formatCurrency(amount, currency, locale.value)

  const formatMoneyRounded = (amount: number, currency: string): string =>
    formatCurrencyRounded(amount, currency, locale.value)

  const getRoundedMoneySign = (amount: number, currency: string): number =>
    getShownSign(amount, currency, { rounded: true })

  return {
    formatMoney,
    formatMoneyRounded,
    getRoundedMoneySign,
  }
}
