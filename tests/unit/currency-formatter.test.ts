import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CURRENCY_CODES } from '../../shared/utils/shared/currencies'
import { formatCurrency, formatCurrencyRounded } from '../../shared/utils/shared/currency-formatter'

const normalizeSpaces = (text: string): string => text.replace(/\s/g, ' ')

const formatCases = [
  { amount: 1234.5, currency: 'USD', locale: 'en', expected: '$1,234.5' },
  { amount: 1234.567, currency: 'USD', locale: 'en', expected: '$1,234.57' },
  { amount: 1234, currency: 'USD', locale: 'en', expected: '$1,234' },
  { amount: 0, currency: 'USD', locale: 'en', expected: '$0' },
  { amount: -1234.5, currency: 'USD', locale: 'en', expected: '-$1,234.5' },
  { amount: 1234.5, currency: 'USD', locale: 'ru', expected: '1 234,5 $' },
  { amount: 1234.5, currency: 'EUR', locale: 'en', expected: '€1,234.5' },
  { amount: -1234.5, currency: 'EUR', locale: 'ru', expected: '-1 234,5 €' },
  { amount: 1234567.891, currency: 'RUB', locale: 'ru', expected: '1 234 567,89 ₽' },
  { amount: 1234.5, currency: 'RUB', locale: 'en', expected: '₽1,234.5' },
  { amount: 1234.5, currency: 'GEL', locale: 'en', expected: '₾1,234.5' },
  { amount: -1234.5, currency: 'GEL', locale: 'en', expected: '-₾1,234.5' },
  { amount: 1234.5, currency: 'GEL', locale: 'ru', expected: '1 234,5 ₾' },
  { amount: 1234.5, currency: 'CAD', locale: 'en', expected: 'CA$1,234.5' },
  { amount: 1000000000, currency: 'CLP', locale: 'en', expected: 'CLP 1,000,000,000' },
  { amount: 1234.5, currency: 'BTC', locale: 'en', expected: 'BTC 1,234.5' },
  { amount: 1234.5, currency: 'BTC', locale: 'ru', expected: '1 234,5 BTC' },
]

formatCases.forEach(({ amount, currency, locale, expected }) => {
  test(`formatCurrency shows ${amount} ${currency} in ${locale} as "${expected}"`, () => {
    assert.equal(normalizeSpaces(formatCurrency(amount, currency, locale)), expected)
  })
})

const roundedCases = [
  { amount: 1234.5, currency: 'USD', locale: 'en', expected: '$1,235' },
  { amount: 1234.49, currency: 'USD', locale: 'en', expected: '$1,234' },
  { amount: 0.4, currency: 'USD', locale: 'en', expected: '$0' },
  { amount: -1234.6, currency: 'USD', locale: 'en', expected: '-$1,235' },
  { amount: -1234.5, currency: 'USD', locale: 'en', expected: '-$1,235' },
  { amount: 999.5, currency: 'EUR', locale: 'ru', expected: '1 000 €' },
  { amount: 45000.4, currency: 'RUB', locale: 'ru', expected: '45 000 ₽' },
]

roundedCases.forEach(({ amount, currency, locale, expected }) => {
  test(`formatCurrencyRounded shows ${amount} ${currency} in ${locale} as "${expected}"`, () => {
    assert.equal(normalizeSpaces(formatCurrencyRounded(amount, currency, locale)), expected)
  })
})

const negativeZeroCases = [
  { name: 'negative zero', format: (): string => formatCurrency(-0, 'USD', 'en'), expected: '$0' },
  { name: '-0.001 USD', format: (): string => formatCurrency(-0.001, 'USD', 'en'), expected: '$0' },
  { name: '-0.4 RUB rounded', format: (): string => formatCurrencyRounded(-0.4, 'RUB', 'ru'), expected: '0 ₽' },
]

negativeZeroCases.forEach(({ name, format, expected }) => {
  test(`formatCurrency shows ${name} as "${expected}" without a minus sign`, () => {
    assert.equal(normalizeSpaces(format()), expected)
  })
})

const hasOnlyLatinDigits = (text: string): boolean =>
  /[0-9]/.test(text) && !/\p{Nd}/u.test(text.replace(/[0-9]/g, ''))

test('formatCurrency uses Latin digits for every supported currency in both languages', () => {
  const invalidCodes = ['en', 'ru'].flatMap(locale =>
    CURRENCY_CODES.filter(code => !hasOnlyLatinDigits(formatCurrency(1234.5, code, locale))),
  )

  assert.deepEqual(invalidCodes, [])
})

test('formatCurrency never shows a dollar sign for a currency other than the US dollar', () => {
  const codesShownAsDollar = CURRENCY_CODES
    .filter(code => code !== 'USD')
    .filter(code => /^-?\$/.test(formatCurrency(1, code, 'en')))

  assert.deepEqual(codesShownAsDollar, [])
})
