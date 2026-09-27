import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BudgetEntry } from '../../shared/types/budget'
import { calculateTotalBalance } from '../../shared/utils/budget/budget'

const RATES = { USD: 1, EUR: 0.5, GEL: 2.5 }
const RATES_WITHOUT_LARI = { USD: 1, EUR: 0.5 }
const MISSING_RATE = 'a currency missing from the rates is converted 1:1 (FOLLOWUPS Б10)'

const entry = (amount: number, currency: string): BudgetEntry => ({
  id: `${amount}-${currency}`,
  description: `${amount} ${currency}`,
  amount,
  currency,
})

const mixedEntries = [entry(100, 'USD'), entry(100, 'EUR'), entry(100, 'GEL')]

const conversionCases = [
  { name: 'keeps an amount already in the base currency', entries: [entry(100, 'GEL')], baseCurrency: 'GEL', expected: 100 },
  { name: 'converts euros to dollars', entries: [entry(100, 'EUR')], baseCurrency: 'USD', expected: 200 },
  { name: 'converts lari to dollars', entries: [entry(100, 'GEL')], baseCurrency: 'USD', expected: 40 },
  { name: 'converts dollars to lari', entries: [entry(100, 'USD')], baseCurrency: 'GEL', expected: 250 },
  { name: 'converts euros to lari through the dollar', entries: [entry(100, 'EUR')], baseCurrency: 'GEL', expected: 500 },
  { name: 'converts lari to euros through the dollar', entries: [entry(100, 'GEL')], baseCurrency: 'EUR', expected: 20 },
  { name: 'sums mixed currencies in dollars', entries: mixedEntries, baseCurrency: 'USD', expected: 340 },
  { name: 'sums mixed currencies in euros', entries: mixedEntries, baseCurrency: 'EUR', expected: 170 },
  { name: 'sums mixed currencies in lari', entries: mixedEntries, baseCurrency: 'GEL', expected: 850 },
  { name: 'returns zero without entries', entries: [], baseCurrency: 'USD', expected: 0 },
]

conversionCases.forEach(({ name, entries, baseCurrency, expected }) => {
  test(`calculateTotalBalance ${name}`, () => {
    const total = calculateTotalBalance(entries, baseCurrency, RATES)

    assert.ok(Math.abs(total - expected) < 1e-9, `expected ${expected}, received ${total}`)
  })
})

test('calculateTotalBalance sums base currency amounts without any rates', () => {
  assert.equal(calculateTotalBalance([entry(100, 'GEL'), entry(50.5, 'GEL')], 'GEL', {}), 150.5)
})

test('calculateTotalBalance leaves the entries untouched', () => {
  const entries = [entry(100, 'EUR'), entry(100, 'GEL')]
  const snapshot = structuredClone(entries)

  calculateTotalBalance(entries, 'USD', RATES)

  assert.deepEqual(entries, snapshot)
})

test('calculateTotalBalance does not count lari without a lari rate as dollars', { todo: MISSING_RATE }, () => {
  assert.notEqual(calculateTotalBalance([entry(2700, 'GEL')], 'USD', RATES_WITHOUT_LARI), 2700)
})

test('calculateTotalBalance does not use rate 1 for a base currency without a rate', { todo: MISSING_RATE }, () => {
  assert.notEqual(calculateTotalBalance([entry(100, 'EUR')], 'GEL', RATES_WITHOUT_LARI), 200)
})
