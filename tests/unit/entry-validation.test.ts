import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getEntryErrorKey } from '../../app/utils/entry-validation'

test('getEntryErrorKey asks for a description of up to 255 characters', () => {
  assert.equal(getEntryErrorKey({ description: '  ', amount: 10 }, 'expense'), 'entry.errors.descriptionRequired')
  assert.equal(getEntryErrorKey({ description: 'a'.repeat(256), amount: 10 }, 'expense'), 'entry.errors.descriptionTooLong')
})

test('getEntryErrorKey allows a zero amount only for a balance', () => {
  assert.equal(getEntryErrorKey({ description: 'Cash', amount: 0 }, 'balance'), null)
  assert.equal(getEntryErrorKey({ description: 'Salary', amount: 0 }, 'income'), 'entry.errors.amountPositive')
  assert.equal(getEntryErrorKey({ description: 'Rent', amount: 0 }, 'expense'), 'entry.errors.amountPositive')
  assert.equal(getEntryErrorKey({ description: 'Cash', amount: -1 }, 'balance'), 'entry.errors.amountNonNegative')
})

test('getEntryErrorKey reports a missing or too large amount', () => {
  assert.equal(getEntryErrorKey({ description: 'Rent', amount: null }, 'expense'), 'entry.errors.amountRequired')
  assert.equal(getEntryErrorKey({ description: 'Rent', amount: 1e14 }, 'expense'), 'entry.errors.amountTooLarge')
  assert.equal(getEntryErrorKey({ description: 'Rent', amount: 1200.5 }, 'expense'), null)
})
