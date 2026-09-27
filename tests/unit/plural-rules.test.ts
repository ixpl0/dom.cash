import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getRussianPluralForm } from '../../i18n/plural-rules'

const formCases = [
  { count: 1, form: 0 },
  { count: 21, form: 0 },
  { count: 101, form: 0 },
  { count: 2, form: 1 },
  { count: 4, form: 1 },
  { count: 34, form: 1 },
  { count: 0, form: 2 },
  { count: 5, form: 2 },
  { count: 11, form: 2 },
  { count: 14, form: 2 },
  { count: 60, form: 2 },
  { count: 111, form: 2 },
]

formCases.forEach(({ count, form }) => {
  test(`getRussianPluralForm picks form ${form} of "минуту | минуты | минут" for ${count}`, () => {
    assert.equal(getRussianPluralForm(count, 3), form)
  })
})

test('getRussianPluralForm never points past the last form', () => {
  assert.equal(getRussianPluralForm(5, 2), 1)
  assert.equal(getRussianPluralForm(1, 1), 0)
})
