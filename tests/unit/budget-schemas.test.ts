import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { authSchema, emailSchema } from '../../shared/schemas/auth'
import { accessSchema, currencySchema } from '../../shared/schemas/common'
import {
  dateReferenceSchema,
  dayOfMonthRecurrenceSchema,
  intervalRecurrenceSchema,
  recurrencePatternSchema,
  weekdaysRecurrenceSchema,
} from '../../shared/schemas/recurrence'
import {
  budgetExportEntrySchema,
  budgetExportMonthSchema,
  budgetExportPlanSchema,
  budgetExportSchema,
  budgetImportOptionsSchema,
} from '../../shared/types/export-import'
import { CURRENCY_CODES } from '../../shared/utils/shared/currencies'

interface Validator {
  safeParse: (input: unknown) => { success: boolean }
}

interface ValidationCase {
  name: string
  input: unknown
  isValid: boolean
}

interface ValidationGroup {
  schemaName: string
  schema: Validator
  cases: ValidationCase[]
}

const FIXTURES_DIRECTORY = new URL('../e2e/fixtures/budgets/', import.meta.url)

const fixtureNames = readdirSync(FIXTURES_DIRECTORY).filter(name => name.endsWith('.json'))

const readFixture = (name: string): unknown => JSON.parse(readFileSync(new URL(name, FIXTURES_DIRECTORY), 'utf8'))

const emailOfLength = (length: number): string => `${'a'.repeat(length - '@b.com'.length)}@b.com`

const validEntry = { kind: 'expense', description: 'Rent', amount: 1200, currency: 'USD' }
const validMonth = { year: 2026, month: 2, entries: [validEntry], exchangeRates: { USD: 1, GEL: 2.7 } }
const validPlan = { year: 2026, month: 3, plannedBalanceChange: 500, comment: 'Save for a trip' }
const validUser = { username: 'owner@example.com', mainCurrency: 'USD' }
const validExport = {
  version: '1.0',
  exportDate: '2026-09-27T10:00:00.000Z',
  user: validUser,
  months: [validMonth],
  plans: [validPlan],
}

const validationGroups: ValidationGroup[] = [
  {
    schemaName: 'budgetExportSchema',
    schema: budgetExportSchema,
    cases: [
      { name: 'a complete export', input: validExport, isValid: true },
      { name: 'an export without plans', input: { ...validExport, plans: undefined }, isValid: true },
      { name: 'an export without months', input: { ...validExport, months: [] }, isValid: true },
      { name: 'format version 1.1', input: { ...validExport, version: '1.1' }, isValid: false },
      { name: 'an export without a version', input: { ...validExport, version: undefined }, isValid: false },
      { name: 'a lowercase main currency', input: { ...validExport, user: { ...validUser, mainCurrency: 'usd' } }, isValid: false },
      { name: 'an empty username', input: { ...validExport, user: { ...validUser, username: '' } }, isValid: false },
      { name: 'a 64-character username', input: { ...validExport, user: { ...validUser, username: 'a'.repeat(64) } }, isValid: true },
      { name: 'a 65-character username', input: { ...validExport, user: { ...validUser, username: 'a'.repeat(65) } }, isValid: false },
      {
        name: 'a username of spaces only',
        input: { ...validExport, user: { ...validUser, username: '   ' } },
        isValid: false,
      },
    ],
  },
  {
    schemaName: 'budgetExportMonthSchema',
    schema: budgetExportMonthSchema,
    cases: [
      { name: 'January as month 0', input: { ...validMonth, month: 0 }, isValid: true },
      { name: 'December as month 11', input: { ...validMonth, month: 11 }, isValid: true },
      { name: 'month -1', input: { ...validMonth, month: -1 }, isValid: false },
      { name: 'month 12', input: { ...validMonth, month: 12 }, isValid: false },
      { name: 'a fractional month', input: { ...validMonth, month: 1.5 }, isValid: false },
      { name: 'year 1900', input: { ...validMonth, year: 1900 }, isValid: true },
      { name: 'year 2100', input: { ...validMonth, year: 2100 }, isValid: true },
      { name: 'year 1899', input: { ...validMonth, year: 1899 }, isValid: false },
      { name: 'year 2101', input: { ...validMonth, year: 2101 }, isValid: false },
      { name: 'a month without exchange rates', input: { ...validMonth, exchangeRates: undefined }, isValid: true },
      { name: 'an exchange rate written as text', input: { ...validMonth, exchangeRates: { GEL: '2.7' } }, isValid: false },
      { name: 'a month without entries', input: { ...validMonth, entries: [] }, isValid: true },
      { name: 'a month with an invalid entry', input: { ...validMonth, entries: [{ ...validEntry, amount: -1 }] }, isValid: false },
    ],
  },
  {
    schemaName: 'budgetExportPlanSchema',
    schema: budgetExportPlanSchema,
    cases: [
      { name: 'a plan with a comment', input: validPlan, isValid: true },
      { name: 'a negative planned change', input: { ...validPlan, plannedBalanceChange: -500 }, isValid: true },
      { name: 'a plan without a planned change', input: { ...validPlan, plannedBalanceChange: null }, isValid: true },
      { name: 'a fractional planned change', input: { ...validPlan, plannedBalanceChange: 10.5 }, isValid: false },
      { name: 'a plan without a comment', input: { ...validPlan, comment: undefined }, isValid: true },
      { name: 'a plan with an empty comment', input: { ...validPlan, comment: null }, isValid: true },
      { name: 'a 2000-character comment', input: { ...validPlan, comment: 'a'.repeat(2000) }, isValid: true },
      { name: 'a 2001-character comment', input: { ...validPlan, comment: 'a'.repeat(2001) }, isValid: false },
      { name: 'month 12', input: { ...validPlan, month: 12 }, isValid: false },
      { name: 'year 2101', input: { ...validPlan, year: 2101 }, isValid: false },
    ],
  },
  {
    schemaName: 'budgetExportEntrySchema',
    schema: budgetExportEntrySchema,
    cases: [
      { name: 'a balance entry', input: { ...validEntry, kind: 'balance' }, isValid: true },
      { name: 'an income entry', input: { ...validEntry, kind: 'income' }, isValid: true },
      { name: 'an expense entry with a date', input: { ...validEntry, date: '2026-03-05' }, isValid: true },
      { name: 'an unknown entry kind', input: { ...validEntry, kind: 'transfer' }, isValid: false },
      { name: 'a zero amount', input: { ...validEntry, amount: 0 }, isValid: true },
      { name: 'a negative amount', input: { ...validEntry, amount: -0.01 }, isValid: false },
      { name: 'an infinite amount', input: { ...validEntry, amount: Number.POSITIVE_INFINITY }, isValid: false },
      { name: 'an amount written as text', input: { ...validEntry, amount: '1200' }, isValid: false },
      { name: 'an empty description', input: { ...validEntry, description: '' }, isValid: false },
      { name: 'a 255-character description', input: { ...validEntry, description: 'a'.repeat(255) }, isValid: true },
      { name: 'a 256-character description', input: { ...validEntry, description: 'a'.repeat(256) }, isValid: false },
      { name: 'currency "usd"', input: { ...validEntry, currency: 'usd' }, isValid: false },
      { name: 'currency "US"', input: { ...validEntry, currency: 'US' }, isValid: false },
      { name: 'currency "USDT"', input: { ...validEntry, currency: 'USDT' }, isValid: false },
      { name: 'currency "U5D"', input: { ...validEntry, currency: 'U5D' }, isValid: false },
      {
        name: 'a date that is not a date',
        input: { ...validEntry, date: 'next Friday' },
        isValid: false,
      },
    ],
  },
  {
    schemaName: 'budgetImportOptionsSchema',
    schema: budgetImportOptionsSchema,
    cases: [
      { name: 'the overwrite strategy', input: { strategy: 'overwrite' }, isValid: true },
      { name: 'an unknown strategy', input: { strategy: 'merge' }, isValid: false },
    ],
  },
  {
    schemaName: 'emailSchema',
    schema: emailSchema,
    cases: [
      { name: 'an address with dots and a plus tag', input: 'first.last+budget@mail.example.co', isValid: true },
      { name: 'the shortest address "a@b"', input: 'a@b', isValid: true },
      { name: 'a 64-character address', input: emailOfLength(64), isValid: true },
      { name: 'a 65-character address', input: emailOfLength(65), isValid: false },
      { name: 'an address that starts with a dot', input: '.user@example.com', isValid: false },
      { name: 'an address with a dot before @', input: 'user.@example.com', isValid: false },
      { name: 'an address whose domain ends with a dot', input: 'user@example.com.', isValid: false },
      { name: 'an address with two @', input: 'user@@example.com', isValid: false },
      { name: 'an address with a space inside', input: 'user@exa mple.com', isValid: false },
      { name: 'text without @', input: 'user.example.com', isValid: false },
      { name: 'a 64-character address with a leading space', input: ` ${emailOfLength(64)}`, isValid: true },
    ],
  },
  {
    schemaName: 'authSchema',
    schema: authSchema,
    cases: [
      { name: 'an 8-character password', input: { username: 'user@example.com', password: 'a'.repeat(8) }, isValid: true },
      { name: 'a 7-character password', input: { username: 'user@example.com', password: 'a'.repeat(7) }, isValid: false },
      { name: 'a 100-character password', input: { username: 'user@example.com', password: 'a'.repeat(100) }, isValid: true },
      { name: 'a 101-character password', input: { username: 'user@example.com', password: 'a'.repeat(101) }, isValid: false },
      { name: 'a username that is not an email', input: { username: 'user', password: 'a'.repeat(8) }, isValid: false },
    ],
  },
  {
    schemaName: 'accessSchema',
    schema: accessSchema,
    cases: [
      { name: 'read access', input: 'read', isValid: true },
      { name: 'write access', input: 'write', isValid: true },
      { name: 'owner access', input: 'owner', isValid: false },
    ],
  },
  {
    schemaName: 'intervalRecurrenceSchema',
    schema: intervalRecurrenceSchema,
    cases: [
      ...['day', 'week', 'month', 'year'].map(unit => ({
        name: `an interval in ${unit}s`,
        input: { type: 'interval', unit, value: 1 },
        isValid: true,
      })),
      { name: 'an interval in hours', input: { type: 'interval', unit: 'hour', value: 1 }, isValid: false },
      { name: 'an interval of 365', input: { type: 'interval', unit: 'day', value: 365 }, isValid: true },
      { name: 'an interval of 366', input: { type: 'interval', unit: 'day', value: 366 }, isValid: false },
      { name: 'an interval of 0', input: { type: 'interval', unit: 'day', value: 0 }, isValid: false },
      { name: 'a fractional interval', input: { type: 'interval', unit: 'week', value: 1.5 }, isValid: false },
    ],
  },
  {
    schemaName: 'weekdaysRecurrenceSchema',
    schema: weekdaysRecurrenceSchema,
    cases: [
      { name: 'Sunday as day 0', input: { type: 'weekdays', days: [0] }, isValid: true },
      { name: 'Saturday as day 6', input: { type: 'weekdays', days: [6] }, isValid: true },
      { name: 'all seven days', input: { type: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] }, isValid: true },
      { name: 'no days', input: { type: 'weekdays', days: [] }, isValid: false },
      { name: 'day 7', input: { type: 'weekdays', days: [7] }, isValid: false },
      { name: 'day -1', input: { type: 'weekdays', days: [-1] }, isValid: false },
      { name: 'eight days', input: { type: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6, 0] }, isValid: false },
      { name: 'a fractional day', input: { type: 'weekdays', days: [1.5] }, isValid: false },
    ],
  },
  {
    schemaName: 'dayOfMonthRecurrenceSchema',
    schema: dayOfMonthRecurrenceSchema,
    cases: [
      { name: 'day 1', input: { type: 'dayOfMonth', day: 1 }, isValid: true },
      { name: 'day 31', input: { type: 'dayOfMonth', day: 31 }, isValid: true },
      { name: 'day 0', input: { type: 'dayOfMonth', day: 0 }, isValid: false },
      { name: 'day 32', input: { type: 'dayOfMonth', day: 32 }, isValid: false },
      { name: 'a fractional day', input: { type: 'dayOfMonth', day: 15.5 }, isValid: false },
    ],
  },
  {
    schemaName: 'recurrencePatternSchema',
    schema: recurrencePatternSchema,
    cases: [
      { name: 'an interval pattern', input: { type: 'interval', unit: 'week', value: 2 }, isValid: true },
      { name: 'a weekdays pattern', input: { type: 'weekdays', days: [1, 3, 5] }, isValid: true },
      { name: 'a day-of-month pattern', input: { type: 'dayOfMonth', day: 31 }, isValid: true },
      { name: 'an unknown pattern type', input: { type: 'yearly', day: 1 }, isValid: false },
      { name: 'a pattern without a type', input: { unit: 'day', value: 1 }, isValid: false },
      { name: 'fields of another pattern type', input: { type: 'dayOfMonth', days: [1] }, isValid: false },
    ],
  },
  {
    schemaName: 'dateReferenceSchema',
    schema: dateReferenceSchema,
    cases: [
      { name: 'the planned date', input: 'planned', isValid: true },
      { name: 'the current date', input: 'now', isValid: true },
      { name: 'an unknown reference', input: 'today', isValid: false },
    ],
  },
]

validationGroups.forEach(({ schemaName, schema, cases }) => {
  cases.forEach(({ name, input, isValid }) => {
    test(`${schemaName} ${isValid ? 'accepts' : 'rejects'} ${name}`, () => {
      assert.equal(schema.safeParse(input).success, isValid)
    })
  })
})

test('the budget fixtures directory has JSON budgets', () => {
  assert.ok(fixtureNames.length > 0)
})

fixtureNames.forEach((name) => {
  test(`budgetExportSchema accepts the ${name} fixture`, () => {
    assert.deepEqual(budgetExportSchema.safeParse(readFixture(name)).error?.issues ?? [], [])
  })
})

test('currencySchema accepts every supported currency code', () => {
  assert.deepEqual(CURRENCY_CODES.filter(code => !currencySchema.safeParse(code).success), [])
})

test('budgetImportOptionsSchema skips existing months by default', () => {
  assert.deepEqual(budgetImportOptionsSchema.parse({}), { strategy: 'skip' })
})

test('emailSchema trims spaces around an address', () => {
  assert.equal(emailSchema.parse('  user@example.com  '), 'user@example.com')
})

test('emailSchema lowercases an address', () => {
  assert.equal(emailSchema.parse('First.Last+Budget@Example.COM'), 'first.last+budget@example.com')
})

test('recurrencePatternSchema drops fields that do not belong to the pattern', () => {
  assert.deepEqual(
    recurrencePatternSchema.parse({ type: 'dayOfMonth', day: 5, unit: 'day', days: [1] }),
    { type: 'dayOfMonth', day: 5 },
  )
})

test('budgetExportEntrySchema keeps the optional flag of an expense', () => {
  assert.deepEqual(budgetExportEntrySchema.parse({ ...validEntry, isOptional: true }), { ...validEntry, isOptional: true })
})
