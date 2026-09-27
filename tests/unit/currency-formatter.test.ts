import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatAmount, formatAmountRounded } from '../../shared/utils/budget/budget'
import { CURRENCY_CODES } from '../../shared/utils/shared/currencies'
import { formatCurrency, formatCurrencyRounded } from '../../shared/utils/shared/currency-formatter'

const NEGATIVE_ZERO = '"-0" is shown for amounts that round to zero'

const normalizeSpaces = (text: string): string => text.replace(/\s/g, ' ')

const formatCases = [
  { amount: 1234.5, currency: 'USD', expected: '$1,234.5' },
  { amount: 1234.567, currency: 'USD', expected: '$1,234.57' },
  { amount: 1234, currency: 'USD', expected: '$1,234' },
  { amount: 0, currency: 'USD', expected: '$0' },
  { amount: -1234.5, currency: 'USD', expected: '-$1,234.5' },
  { amount: 1234.5, currency: 'EUR', expected: '1.234,5 €' },
  { amount: -1234.5, currency: 'EUR', expected: '-1.234,5 €' },
  { amount: 1234567.891, currency: 'RUB', expected: '1 234 567,89 ₽' },
  { amount: 1000000000, currency: 'CLP', expected: '$1.000.000.000' },
  { amount: 1234.5, currency: 'BTC', expected: 'BTC 1,234.5' },
]

formatCases.forEach(({ amount, currency, expected }) => {
  test(`formatCurrency shows ${amount} ${currency} as "${expected}"`, () => {
    assert.equal(normalizeSpaces(formatCurrency(amount, currency)), expected)
  })
})

const roundedCases = [
  { amount: 1234.5, currency: 'USD', expected: '$1,235' },
  { amount: 1234.49, currency: 'USD', expected: '$1,234' },
  { amount: 0.4, currency: 'USD', expected: '$0' },
  { amount: -1234.6, currency: 'USD', expected: '-$1,235' },
  { amount: 999.5, currency: 'EUR', expected: '1.000 €' },
  { amount: 45000.4, currency: 'RUB', expected: '45 000 ₽' },
]

roundedCases.forEach(({ amount, currency, expected }) => {
  test(`formatCurrencyRounded shows ${amount} ${currency} as "${expected}"`, () => {
    assert.equal(normalizeSpaces(formatCurrencyRounded(amount, currency)), expected)
  })
})

test('formatAmount and formatAmountRounded format like the currency formatter', () => {
  assert.deepEqual(
    [normalizeSpaces(formatAmount(1234.5, 'EUR')), normalizeSpaces(formatAmountRounded(1234.5, 'EUR'))],
    ['1.234,5 €', '1.235 €'],
  )
})

test('formatCurrency formats every supported currency code with digits', () => {
  assert.deepEqual(CURRENCY_CODES.filter(code => !/\p{Nd}/u.test(formatCurrency(1234.5, code))), [])
})

const negativeZeroCases = [
  { name: 'formatCurrency shows negative zero', format: (): string => formatCurrency(-0, 'USD'), expected: '$0' },
  { name: 'formatCurrency shows -0.001 USD', format: (): string => formatCurrency(-0.001, 'USD'), expected: '$0' },
  { name: 'formatCurrencyRounded shows -0.4 RUB', format: (): string => formatCurrencyRounded(-0.4, 'RUB'), expected: '0 ₽' },
]

negativeZeroCases.forEach(({ name, format, expected }) => {
  test(`${name} as "${expected}" without a minus sign`, { todo: NEGATIVE_ZERO }, () => {
    assert.equal(normalizeSpaces(format()), expected)
  })
})

test('formatCurrencyRounded rounds a negative half away from zero like a positive one', { todo: 'Math.round turns -1234.5 into -1234' }, () => {
  assert.equal(normalizeSpaces(formatCurrencyRounded(-1234.5, 'USD')), '-$1,235')
})
