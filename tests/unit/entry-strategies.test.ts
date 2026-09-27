import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BalanceSourceData, ExpenseEntryData, IncomeEntryData, MonthData } from '../../shared/types/budget'
import {
  entryStrategies,
  findEntryKindByEntryId,
  getEntryConfig,
  monthHasEntry,
  updateMonthWithDeletedEntry,
  updateMonthWithNewEntry,
  updateMonthWithUpdatedEntry,
} from '../../shared/utils/budget/entry-strategies'

type EntryKind = keyof typeof entryStrategies

type EntryListName = 'balanceSources' | 'incomeEntries' | 'expenseEntries'

type Entry = BalanceSourceData | IncomeEntryData | ExpenseEntryData

interface UpdateCase {
  name: string
  kind: EntryKind
  entryId: string
  update: Parameters<typeof updateMonthWithUpdatedEntry>[3]
  expected: Entry
}

const LIST_NAMES: Record<EntryKind, EntryListName> = {
  balance: 'balanceSources',
  income: 'incomeEntries',
  expense: 'expenseEntries',
}

const ENTRY_KINDS: EntryKind[] = ['balance', 'income', 'expense']

const createMonth = (): MonthData => ({
  id: 'month-2026-03',
  year: 2026,
  month: 2,
  balanceSources: [
    { id: 'cash', description: 'Cash', amount: 1000, currency: 'USD' },
    { id: 'card', description: 'Card', amount: 500, currency: 'GEL' },
  ],
  incomeEntries: [
    { id: 'salary', description: 'Salary', amount: 3000, currency: 'USD', date: '2026-03-05' },
  ],
  expenseEntries: [
    { id: 'rent', description: 'Rent', amount: 1200, currency: 'USD', date: '2026-03-01', isOptional: false },
    { id: 'cinema', description: 'Cinema', amount: 30, currency: 'GEL', date: null, isOptional: true },
  ],
  exchangeRates: { USD: 1, GEL: 2.5 },
  exchangeRatesSource: '2026-03-01',
})

ENTRY_KINDS.forEach((kind) => {
  test(`getEntryConfig keeps ${kind} entries in ${LIST_NAMES[kind]} with ${kind} translations`, () => {
    const config = getEntryConfig(kind)

    assert.equal(config, entryStrategies[kind])
    assert.deepEqual(
      [config.arrayKey, config.titleKey, config.emptyMessageKey],
      [LIST_NAMES[kind], `entry.${kind}.title`, `entry.${kind}.emptyMessage`],
    )
  })
})

test('createEntry keeps only the fields of each entry kind', () => {
  const input = { id: 'coffee', description: 'Coffee', amount: 4.5, currency: 'GEL', date: '2026-03-07', isOptional: true }
  const { isOptional, ...incomeFields } = input
  const { date, ...balanceFields } = incomeFields

  assert.deepEqual(entryStrategies.balance.createEntry(input), balanceFields)
  assert.deepEqual(entryStrategies.income.createEntry(input), { ...balanceFields, date })
  assert.deepEqual(entryStrategies.expense.createEntry(input), { ...balanceFields, date, isOptional })
})

test('createEntry fills a missing date with null and a missing optional flag with false', () => {
  const input = { id: 'coffee', description: 'Coffee', amount: 4.5, currency: 'GEL' }

  assert.deepEqual(entryStrategies.income.createEntry(input), { ...input, date: null })
  assert.deepEqual(entryStrategies.expense.createEntry({ ...input, date: '' }), { ...input, date: null, isOptional: false })
})

const lookupCases: Array<{ kind: EntryKind, entryId: string, expected: boolean }> = [
  { kind: 'balance', entryId: 'cash', expected: true },
  { kind: 'income', entryId: 'salary', expected: true },
  { kind: 'expense', entryId: 'cinema', expected: true },
  { kind: 'expense', entryId: 'salary', expected: false },
  { kind: 'balance', entryId: 'missing', expected: false },
]

lookupCases.forEach(({ kind, entryId, expected }) => {
  test(`monthHasEntry ${expected ? 'finds' : 'does not find'} "${entryId}" among ${kind} entries`, () => {
    assert.equal(monthHasEntry(createMonth(), kind, entryId), expected)
  })
})

const newEntries: Record<EntryKind, Entry> = {
  balance: { id: 'deposit', description: 'Deposit', amount: 2000, currency: 'EUR' },
  income: { id: 'bonus', description: 'Bonus', amount: 400, currency: 'USD', date: null },
  expense: { id: 'taxi', description: 'Taxi', amount: 12, currency: 'GEL', date: '2026-03-08', isOptional: true },
}

ENTRY_KINDS.forEach((kind) => {
  test(`updateMonthWithNewEntry appends a ${kind} entry to a new month and leaves the old one untouched`, () => {
    const month = createMonth()
    const snapshot = structuredClone(month)
    const listName = LIST_NAMES[kind]
    const result = updateMonthWithNewEntry(month, kind, newEntries[kind])

    assert.deepEqual(result, { ...snapshot, [listName]: [...snapshot[listName], newEntries[kind]] })
    assert.notEqual(result[listName], month[listName])
    assert.deepEqual(month, snapshot)
  })
})

const updateCases: UpdateCase[] = [
  {
    name: 'changes the description and currency of an expense',
    kind: 'expense',
    entryId: 'cinema',
    update: { description: 'Theatre', currency: 'USD' },
    expected: { id: 'cinema', description: 'Theatre', amount: 30, currency: 'USD', date: null, isOptional: true },
  },
  {
    name: 'sets the amount of an expense to zero',
    kind: 'expense',
    entryId: 'rent',
    update: { amount: 0 },
    expected: { id: 'rent', description: 'Rent', amount: 0, currency: 'USD', date: '2026-03-01', isOptional: false },
  },
  {
    name: 'clears the date of an expense',
    kind: 'expense',
    entryId: 'rent',
    update: { date: null },
    expected: { id: 'rent', description: 'Rent', amount: 1200, currency: 'USD', date: null, isOptional: false },
  },
  {
    name: 'makes an optional expense required',
    kind: 'expense',
    entryId: 'cinema',
    update: { isOptional: false },
    expected: { id: 'cinema', description: 'Cinema', amount: 30, currency: 'GEL', date: null, isOptional: false },
  },
  {
    name: 'keeps an income without an optional flag',
    kind: 'income',
    entryId: 'salary',
    update: { amount: 3500, isOptional: true },
    expected: { id: 'salary', description: 'Salary', amount: 3500, currency: 'USD', date: '2026-03-05' },
  },
  {
    name: 'keeps a balance without a date',
    kind: 'balance',
    entryId: 'card',
    update: { amount: 750, date: '2026-03-10' },
    expected: { id: 'card', description: 'Card', amount: 750, currency: 'GEL' },
  },
]

updateCases.forEach(({ name, kind, entryId, update, expected }) => {
  test(`updateMonthWithUpdatedEntry ${name}`, () => {
    const month = createMonth()
    const snapshot = structuredClone(month)
    const listName = LIST_NAMES[kind]
    const result = updateMonthWithUpdatedEntry(month, kind, entryId, update)

    assert.deepEqual(result, {
      ...snapshot,
      [listName]: snapshot[listName].map((entry: Entry) => (entry.id === entryId ? expected : entry)),
    })
    assert.deepEqual(month, snapshot)
  })
})

test('updateMonthWithUpdatedEntry returns the same month when the entry is not in the given kind', () => {
  const month = createMonth()

  assert.equal(updateMonthWithUpdatedEntry(month, 'income', 'rent', { amount: 1 }), month)
})

test('updateMonthWithDeletedEntry removes the entry from its own list only', () => {
  const month = createMonth()
  const snapshot = structuredClone(month)
  const result = updateMonthWithDeletedEntry(month, 'expense', 'rent')

  assert.deepEqual(result, { ...snapshot, expenseEntries: snapshot.expenseEntries.filter(entry => entry.id !== 'rent') })
  assert.deepEqual(month, snapshot)
})

test('updateMonthWithDeletedEntry keeps the month content when the entry is not in the given kind', () => {
  const month = createMonth()

  assert.deepEqual(updateMonthWithDeletedEntry(month, 'income', 'rent'), createMonth())
})

const kindLookupCases = [
  { entryId: 'card', expected: 'balance' },
  { entryId: 'salary', expected: 'income' },
  { entryId: 'cinema', expected: 'expense' },
  { entryId: 'missing', expected: null },
]

kindLookupCases.forEach(({ entryId, expected }) => {
  test(`findEntryKindByEntryId returns ${expected} for "${entryId}"`, () => {
    assert.equal(findEntryKindByEntryId(createMonth(), entryId), expected)
  })
})
