import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useDatabase } from '../../server/db'
import { entry, month, plan, user } from '../../server/db/schema'
import { importBudget } from '../../server/services/budget/import-export'
import type { BudgetExportData, BudgetExportEntry, BudgetExportMonth, BudgetExportPlan } from '../../shared/types/export-import'
import { createTestDatabase, type TestDatabase } from './helpers/test-database'

const OWNER_ID = 'owner'

const createOwner = async (): Promise<TestDatabase> => {
  const database = createTestDatabase()
  await useDatabase(database.event)
    .insert(user)
    .values({ id: OWNER_ID, username: 'owner@example.com', passwordHash: 'hash', mainCurrency: 'USD', createdAt: new Date() })
  return database
}

const addMonth = async (database: TestDatabase, id: string, year: number, monthIndex: number, descriptions: string[]): Promise<void> => {
  const db = useDatabase(database.event)
  await db.insert(month).values({ id, userId: OWNER_ID, year, month: monthIndex })
  await db.insert(entry).values(descriptions.map((description, index) => ({
    id: `${id}-${index}`,
    monthId: id,
    kind: 'expense' as const,
    description,
    amount: 10,
    currency: 'USD',
  })))
}

const addPlan = async (database: TestDatabase, year: number, monthIndex: number, plannedBalanceChange: number): Promise<void> => {
  await useDatabase(database.event)
    .insert(plan)
    .values({ id: `plan-${year}-${monthIndex}`, userId: OWNER_ID, year, month: monthIndex, plannedBalanceChange, comment: 'Saved' })
}

const createEntry = (description: string, currency = 'USD'): BudgetExportEntry => ({
  kind: 'expense',
  description,
  amount: 25,
  currency,
})

const createMonth = (year: number, monthIndex: number, descriptions: string[]): BudgetExportMonth => ({
  year,
  month: monthIndex,
  entries: descriptions.map(description => createEntry(description)),
})

const createFile = (months: BudgetExportMonth[], plans: BudgetExportPlan[] = []): BudgetExportData => ({
  version: '1.1',
  exportDate: '2026-09-30T12:00:00.000Z',
  user: { username: 'owner@example.com', mainCurrency: 'USD' },
  months,
  plans,
})

const countRows = (database: TestDatabase, table: string): number =>
  Number(database.sqlite.prepare(`SELECT count(*) AS total FROM ${table}`).get()?.total)

const readMonthDescriptions = (database: TestDatabase): Record<string, string[]> =>
  database.sqlite
    .prepare('SELECT m.year, m.month, e.description FROM month m JOIN entry e ON e.month_id = m.id ORDER BY m.year, m.month, e.description')
    .all()
    .reduce<Record<string, string[]>>((result, row) => {
      const key = `${row.year}-${row.month}`
      return { ...result, [key]: [...(result[key] ?? []), String(row.description)] }
    }, {})

const readPlans = (database: TestDatabase): Record<string, string> =>
  Object.fromEntries(database.sqlite
    .prepare('SELECT year, month, planned_balance_change AS amount, comment FROM plan ORDER BY year, month')
    .all()
    .map(row => [`${row.year}-${row.month}`, `${row.amount} ${row.comment}`]))

const createLargeFile = (): BudgetExportData => createFile(
  Array.from({ length: 35 }, (_, index) => createMonth(2020 + Math.floor(index / 12), index % 12, ['a', 'b', 'c', 'd', 'e'])),
  Array.from({ length: 14 }, (_, index) => ({ year: 2023 + Math.floor(index / 12), month: index % 12, plannedBalanceChange: 100 + index, comment: null })),
)

test('importBudget writes a large budget with two reads and one batch', async () => {
  const database = await createOwner()
  const queriesBefore = database.getQueries().length
  const requestsBefore = database.getRequestCount()

  const result = await importBudget(OWNER_ID, createLargeFile(), { strategy: 'skip' }, database.event)

  assert.deepEqual(result, { importedMonths: 35, importedEntries: 175, skippedMonths: 0 })
  assert.equal(database.getRequestCount() - requestsBefore, 3)
  assert.equal(database.getQueries().length - queriesBefore, 21)
  assert.equal(countRows(database, 'month'), 35)
  assert.equal(countRows(database, 'entry'), 175)
  assert.equal(countRows(database, 'plan'), 14)
})

test('importBudget needs as many requests for one month as for a large budget', async () => {
  const database = await createOwner()
  const requestsBefore = database.getRequestCount()

  await importBudget(OWNER_ID, createFile([createMonth(2026, 8, ['Rent'])], [{ year: 2026, month: 8, plannedBalanceChange: 5, comment: null }]), { strategy: 'overwrite' }, database.event)

  assert.equal(database.getRequestCount() - requestsBefore, 3)
})

test('importBudget with skip keeps existing months and plans and adds new ones', async () => {
  const database = await createOwner()
  await addMonth(database, 'existing', 2026, 7, ['Old'])
  await addPlan(database, 2026, 7, 300)

  const result = await importBudget(OWNER_ID, createFile(
    [createMonth(2026, 7, ['New']), createMonth(2026, 8, ['Next'])],
    [
      { year: 2026, month: 7, plannedBalanceChange: 1, comment: 'File' },
      { year: 2026, month: 8, plannedBalanceChange: 2, comment: 'File' },
    ],
  ), { strategy: 'skip' }, database.event)

  assert.deepEqual(result, { importedMonths: 1, importedEntries: 1, skippedMonths: 1 })
  assert.deepEqual(readMonthDescriptions(database), { '2026-7': ['Old'], '2026-8': ['Next'] })
  assert.deepEqual(readPlans(database), { '2026-7': '300 Saved', '2026-8': '2 File' })
})

test('importBudget with overwrite replaces the entries and plans of existing months and keeps their ids', async () => {
  const database = await createOwner()
  await addMonth(database, 'existing', 2026, 7, ['Old', 'Older'])
  await addMonth(database, 'untouched', 2026, 6, ['Kept'])
  await addPlan(database, 2026, 7, 300)

  const result = await importBudget(OWNER_ID, createFile(
    [createMonth(2026, 7, ['New']), createMonth(2026, 8, ['Next'])],
    [{ year: 2026, month: 7, plannedBalanceChange: 1, comment: null }],
  ), { strategy: 'overwrite' }, database.event)

  assert.deepEqual(result, { importedMonths: 2, importedEntries: 2, skippedMonths: 0 })
  assert.deepEqual(readMonthDescriptions(database), { '2026-6': ['Kept'], '2026-7': ['New'], '2026-8': ['Next'] })
  assert.equal(database.sqlite.prepare('SELECT id FROM month WHERE year = 2026 AND month = 7').get()?.id, 'existing')
  assert.deepEqual(readPlans(database), { '2026-7': '1 null' })
})

test('importBudget takes the first copy of a month repeated in the file', async () => {
  const database = await createOwner()

  const result = await importBudget(OWNER_ID, createFile(
    [createMonth(2026, 7, ['First']), createMonth(2026, 7, ['Second', 'Third'])],
    [
      { year: 2026, month: 7, plannedBalanceChange: 1, comment: null },
      { year: 2026, month: 7, plannedBalanceChange: 2, comment: null },
    ],
  ), { strategy: 'skip' }, database.event)

  assert.deepEqual(result, { importedMonths: 1, importedEntries: 1, skippedMonths: 0 })
  assert.deepEqual(readMonthDescriptions(database), { '2026-7': ['First'] })
  assert.deepEqual(readPlans(database), { '2026-7': '1 null' })
})

test('importBudget writes nothing when any row fails', async () => {
  const database = await createOwner()
  await addMonth(database, 'existing', 2026, 7, ['Old'])
  await addPlan(database, 2026, 7, 300)
  const brokenMonth = { ...createMonth(2026, 9, []), entries: [createEntry('Broken', 'usd')] }

  await assert.rejects(importBudget(OWNER_ID, createFile(
    [createMonth(2026, 7, ['New']), createMonth(2026, 8, ['Next']), brokenMonth],
    [{ year: 2026, month: 7, plannedBalanceChange: 1, comment: null }],
  ), { strategy: 'overwrite' }, database.event))

  assert.deepEqual(readMonthDescriptions(database), { '2026-7': ['Old'] })
  assert.equal(countRows(database, 'month'), 1)
  assert.deepEqual(readPlans(database), { '2026-7': '300 Saved' })
})
