import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { useDatabase } from '../../server/db'
import { currency, plan, user } from '../../server/db/schema'
import { changeMainCurrency } from '../../server/services/budget/currency'
import { chunkArray, getRowsPerInsertStatement } from '../../server/utils/d1-limits'
import { MAX_AMOUNT } from '../../shared/schemas/common'
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
    .prepare('SELECT id, planned_balance_change AS amount FROM plan ORDER BY year, month')
    .all()
    .map(row => [String(row.id), row.amount === null ? null : Number(row.amount)]))

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
