import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { useDatabase } from '../../server/db'
import { currency, plan, user } from '../../server/db/schema'
import { changeMainCurrency } from '../../server/services/budget/currency'
import { importBudget } from '../../server/services/budget/import-export'
import { chunkArray, getRowsPerInsertStatement } from '../../server/utils/d1-limits'
import { MAX_AMOUNT } from '../../shared/schemas/common'
import type { BudgetExportData, BudgetExportPlan } from '../../shared/types/export-import'
import { createTestDatabase, type TestDatabase } from './helpers/test-database'

interface PlanRow {
  year: number
  month: number
  plannedBalanceChange: number | null
}

const OWNER_ID = 'owner'

const pinClock = (context: TestContext, date = '2026-08-15T12:00:00Z') => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date(date) })
}

const createBudget = async (plans: PlanRow[], rates: { date: string, rates: Record<string, number> }[]): Promise<TestDatabase> => {
  const database = createTestDatabase()
  const db = useDatabase(database.event)
  await db.insert(user).values({ id: OWNER_ID, username: 'owner@example.com', passwordHash: 'hash', mainCurrency: 'USD', createdAt: new Date() })
  if (rates.length > 0) {
    await db.insert(currency).values(rates)
  }
  const planRows = plans.map(planRow => ({ ...planRow, id: `${planRow.year}-${planRow.month}`, userId: OWNER_ID, comment: null }))
  await Promise.all(chunkArray(planRows, getRowsPerInsertStatement(plan)).map(chunk => db.insert(plan).values(chunk)))
  return database
}

const readPlans = (database: TestDatabase): Record<string, number | null> =>
  Object.fromEntries(database.sqlite
    .prepare('SELECT year, month, planned_balance_change AS amount FROM plan ORDER BY year, month')
    .all()
    .map(row => [`${row.year}-${row.month}`, row.amount === null ? null : Number(row.amount)]))

const createImportFile = (mainCurrency: string, plans: BudgetExportPlan[]): BudgetExportData => ({
  version: '1.1',
  exportDate: '2026-08-15T12:00:00.000Z',
  user: { username: 'owner@example.com', mainCurrency },
  months: [],
  plans,
})

const readMainCurrency = (database: TestDatabase): string =>
  String(database.sqlite.prepare('SELECT main_currency AS currency FROM user WHERE id = ?').get(OWNER_ID)?.currency)

test('changeMainCurrency converts every plan with the rates of its month and rounds it', async (context) => {
  pinClock(context)
  const database = await createBudget(
    [
      { year: 2026, month: 6, plannedBalanceChange: 1000 },
      { year: 2026, month: 7, plannedBalanceChange: -333 },
      { year: 2026, month: 8, plannedBalanceChange: null },
      { year: 2027, month: 0, plannedBalanceChange: 500 },
    ],
    [
      { date: '2026-07-01', rates: { USD: 1, EUR: 0.8 } },
      { date: '2026-08-01', rates: { USD: 1, EUR: 0.9 } },
    ],
  )

  await changeMainCurrency(OWNER_ID, 'EUR', database.event)

  assert.equal(readMainCurrency(database), 'EUR')
  assert.deepEqual(readPlans(database), { '2026-6': 800, '2026-7': -300, '2026-8': null, '2027-0': 450 })
})

test('changeMainCurrency to the same currency leaves the plans alone', async (context) => {
  pinClock(context)
  const database = await createBudget([{ year: 2026, month: 6, plannedBalanceChange: 1000 }], [])

  await changeMainCurrency(OWNER_ID, 'USD', database.event)

  assert.deepEqual(readPlans(database), { '2026-6': 1000 })
})

test('changeMainCurrency keeps converted plans within the amount limit', async (context) => {
  pinClock(context)
  const database = await createBudget(
    [
      { year: 2026, month: 6, plannedBalanceChange: MAX_AMOUNT },
      { year: 2026, month: 7, plannedBalanceChange: -MAX_AMOUNT },
    ],
    [{ date: '2026-08-01', rates: { USD: 1, GEL: 2.7 } }],
  )

  await changeMainCurrency(OWNER_ID, 'GEL', database.event)

  assert.deepEqual(readPlans(database), { '2026-6': MAX_AMOUNT, '2026-7': -MAX_AMOUNT })
})

test('changeMainCurrency converts more plans than one statement can bind', async (context) => {
  pinClock(context)
  const plans = Array.from({ length: 120 }, (_, index) => ({ year: 2010 + Math.floor(index / 12), month: index % 12, plannedBalanceChange: 100 }))
  const database = await createBudget(plans, [{ date: '2015-06-01', rates: { USD: 1, GEL: 2 } }])

  await changeMainCurrency(OWNER_ID, 'GEL', database.event)

  assert.deepEqual(new Set(Object.values(readPlans(database))), new Set([200]))
  assert.equal(Object.keys(readPlans(database)).length, 120)
})

test('changeMainCurrency changes nothing when the plans cannot be converted', async (context) => {
  pinClock(context)
  const database = await createBudget([{ year: 2026, month: 6, plannedBalanceChange: 1000 }], [])

  await assert.rejects(changeMainCurrency(OWNER_ID, 'EUR', database.event), { statusCode: 503 })

  assert.equal(readMainCurrency(database), 'USD')
  assert.deepEqual(readPlans(database), { '2026-6': 1000 })
})

test('importBudget converts the plans of a file kept in another main currency', async (context) => {
  pinClock(context)
  const database = await createBudget([], [
    { date: '2026-07-01', rates: { USD: 1, EUR: 0.8 } },
    { date: '2026-08-01', rates: { USD: 1, EUR: 0.9 } },
  ])

  const result = await importBudget(OWNER_ID, createImportFile('EUR', [
    { year: 2026, month: 6, plannedBalanceChange: 800, comment: null },
    { year: 2026, month: 7, plannedBalanceChange: -90, comment: null },
    { year: 2026, month: 8, plannedBalanceChange: null, comment: 'Only a note' },
  ]), { strategy: 'skip' }, database.event)

  assert.equal(result.success, true)
  assert.deepEqual(readPlans(database), { '2026-6': 1000, '2026-7': -100, '2026-8': null })
})

test('importBudget keeps the plans of a file in the same main currency without rates', async (context) => {
  pinClock(context)
  const database = await createBudget([], [])

  const result = await importBudget(OWNER_ID, createImportFile('USD', [
    { year: 2026, month: 6, plannedBalanceChange: 1000, comment: null },
  ]), { strategy: 'skip' }, database.event)

  assert.equal(result.success, true)
  assert.deepEqual(readPlans(database), { '2026-6': 1000 })
})

test('changeMainCurrency refuses and changes nothing when a planned month has no rate for the new currency', async (context) => {
  pinClock(context)
  const database = await createBudget(
    [{ year: 2026, month: 6, plannedBalanceChange: 1000 }],
    [{ date: '2026-08-01', rates: { USD: 1, EUR: 0.9 } }],
  )

  await assert.rejects(changeMainCurrency(OWNER_ID, 'GEL', database.event), { statusCode: 409 })

  assert.equal(readMainCurrency(database), 'USD')
  assert.deepEqual(readPlans(database), { '2026-6': 1000 })
})

test('importBudget refuses a file whose plans cannot be converted and imports nothing', async (context) => {
  pinClock(context)
  const database = await createBudget([], [{ date: '2026-08-01', rates: { USD: 1, EUR: 0.9 } }])
  const file = {
    ...createImportFile('GEL', [{ year: 2026, month: 6, plannedBalanceChange: 270, comment: null }]),
    months: [{ year: 2026, month: 6, entries: [{ kind: 'balance' as const, description: 'Cash', amount: 100, currency: 'GEL' }] }],
  }

  await assert.rejects(importBudget(OWNER_ID, file, { strategy: 'skip' }, database.event), { statusCode: 409 })

  assert.deepEqual(readPlans(database), {})
  assert.equal(Number(database.sqlite.prepare('SELECT count(*) AS total FROM month').get()?.total), 0)
})
