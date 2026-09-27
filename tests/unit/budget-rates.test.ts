import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { useDatabase } from '../../server/db'
import { currency, entry, month, user } from '../../server/db/schema'
import { createMonth, loadMonths } from '../../server/services/budget/months'
import { getExchangeRatesForMonth, loadExchangeRates } from '../../server/services/budget/rates'
import { createTestDatabase, type TestDatabase } from './helpers/test-database'

interface StoredRates {
  date: string
  rates: Record<string, number>
}

const createDatabaseWithRates = async (rows: StoredRates[] = []): Promise<TestDatabase> => {
  const database = createTestDatabase()
  if (rows.length > 0) {
    await useDatabase(database.event).insert(currency).values(rows)
  }
  return database
}

const upsertRates = async (database: TestDatabase, row: StoredRates): Promise<void> => {
  await useDatabase(database.event)
    .insert(currency)
    .values(row)
    .onConflictDoUpdate({ target: currency.date, set: { rates: row.rates } })
}

const readStoredRates = (database: TestDatabase, date: string): unknown => {
  const row = database.sqlite.prepare('SELECT rates FROM currency WHERE date = ?').get(date)
  return row ? JSON.parse(String(row.rates)) : null
}

const countQueries = async (database: TestDatabase, action: () => Promise<unknown>): Promise<number> => {
  const previousQueryCount = database.getQueries().length
  await action()
  return database.getQueries().length - previousQueryCount
}

const prepareClock = (context: TestContext, date = '2026-09-06T12:00:00Z') => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date(date) })
  context.mock.method(console, 'error', () => {})
  context.mock.method(console, 'log', () => {})
  const previousApiKey = process.env.OPENEXCHANGERATES_APP_ID
  process.env.OPENEXCHANGERATES_APP_ID = 'test-rates-key'
  context.after(() => {
    if (previousApiKey === undefined) {
      delete process.env.OPENEXCHANGERATES_APP_ID
    }
    else {
      process.env.OPENEXCHANGERATES_APP_ID = previousApiKey
    }
  })
}

test('failed updates use previous rates and retry after an hour', async (context) => {
  prepareClock(context)
  const database = await createDatabaseWithRates([{ date: '2026-08-01', rates: { USD: 1, GEL: 2.7 } }])
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }))

  assert.deepEqual(await getExchangeRatesForMonth(2026, 8, database.event), {
    rates: { USD: 1, GEL: 2.7 }, source: '2026-08-01',
  })
  assert.deepEqual(readStoredRates(database, '2026-09-01'), {})

  await getExchangeRatesForMonth(2026, 8, database.event)
  assert.equal(fetchMock.mock.callCount(), 1)

  context.mock.timers.tick(60 * 60 * 1000)
  fetchMock.mock.mockImplementation(async () => Response.json({ rates: { USD: 1, GEL: 2.8 } }))
  assert.deepEqual(await getExchangeRatesForMonth(2026, 8, database.event), {
    rates: { USD: 1, GEL: 2.8 }, source: '2026-09-01',
  })
  assert.equal(fetchMock.mock.callCount(), 2)
  assert.deepEqual(readStoredRates(database, '2026-09-01'), { USD: 1, GEL: 2.8 })
})

test('fallback skips empty and invalid records before applying the date limit', async (context) => {
  prepareClock(context)
  const database = await createDatabaseWithRates([
    { date: '2025-10-01', rates: { USD: 1, GEL: 2.7 } },
    { date: '2025-11-01', rates: {} },
    { date: '2025-12-01', rates: {} },
    { date: '2026-01-01', rates: { USD: 1, GEL: 0 } },
    { date: '2026-02-01', rates: { USD: 1, GEL: 2.9 } },
  ])
  assert.deepEqual(await getExchangeRatesForMonth(2025, 11, database.event), {
    rates: { USD: 1, GEL: 2.7 }, source: '2025-10-01',
  })
})

test('new exact rates replace fallback and updated exact rates are read immediately', async (context) => {
  prepareClock(context)
  const database = await createDatabaseWithRates([{ date: '2026-09-01', rates: { USD: 1, GEL: 2.7 } }])
  assert.equal((await getExchangeRatesForMonth(2026, 9, database.event)).source, '2026-09-01')

  await upsertRates(database, { date: '2026-10-01', rates: { USD: 1, GEL: 2.8 } })
  const queryCount = await countQueries(database, async () => {
    assert.deepEqual(await getExchangeRatesForMonth(2026, 9, database.event), {
      rates: { USD: 1, GEL: 2.8 }, source: '2026-10-01',
    })
  })
  assert.equal(queryCount, 1)

  await upsertRates(database, { date: '2026-10-01', rates: { USD: 1, GEL: 2.9 } })
  assert.equal((await getExchangeRatesForMonth(2026, 9, database.event)).rates.GEL, 2.9)
})

test('a future month starts updating when it becomes current after midnight UTC', async (context) => {
  prepareClock(context, '2026-09-30T23:59:00Z')
  const database = await createDatabaseWithRates([{ date: '2026-09-01', rates: { USD: 1, GEL: 2.7 } }])
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ rates: { USD: 1, GEL: 2.8 } }))

  assert.equal((await getExchangeRatesForMonth(2026, 9, database.event)).source, '2026-09-01')
  context.mock.timers.tick(2 * 60 * 1000)
  assert.equal((await getExchangeRatesForMonth(2026, 9, database.event)).source, '2026-09-01')
  assert.equal(fetchMock.mock.callCount(), 0)

  context.mock.timers.tick(4 * 60 * 1000)
  assert.equal((await getExchangeRatesForMonth(2026, 9, database.event)).source, '2026-10-01')
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('missing valid rates fail explicitly and do not block later recovery', async (context) => {
  prepareClock(context)
  const database = await createDatabaseWithRates([{ date: '2025-12-01', rates: {} }])
  await assert.rejects(getExchangeRatesForMonth(2025, 11, database.event), {
    statusCode: 503,
    message: 'serverErrors.failed_to_update_rates',
  })

  await upsertRates(database, { date: '2025-12-01', rates: { USD: 1, GEL: 2.7 } })
  assert.deepEqual(await getExchangeRatesForMonth(2025, 11, database.event), {
    rates: { USD: 1, GEL: 2.7 }, source: '2025-12-01',
  })
})

test('rates for many months are read with one query', async (context) => {
  prepareClock(context)
  const months = Array.from({ length: 24 }, (_, index) => ({ year: 2024 + Math.floor(index / 12), month: index % 12 }))
  const database = await createDatabaseWithRates(months.map(({ year, month: monthNumber }) => ({
    date: `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`,
    rates: { USD: 1, GEL: 2 + monthNumber / 10 },
  })))

  const queryCount = await countQueries(database, async () => {
    const getExchangeRates = await loadExchangeRates(months, database.event)
    assert.deepEqual(getExchangeRates(2025, 11), { rates: { USD: 1, GEL: 3.1 }, source: '2025-12-01' })
    assert.deepEqual(getExchangeRates(2024, 0), { rates: { USD: 1, GEL: 2 }, source: '2024-01-01' })
  })
  assert.equal(queryCount, 1)
})

test('a month without rates takes the closest stored month, inside or outside the loaded range', async (context) => {
  prepareClock(context)
  const database = await createDatabaseWithRates([
    { date: '2025-11-01', rates: { USD: 1, GEL: 2.5 } },
    { date: '2026-01-01', rates: { USD: 1, GEL: 2.6 } },
    { date: '2026-03-01', rates: { USD: 1, GEL: 2.8 } },
  ])

  const getExchangeRates = await loadExchangeRates([
    { year: 2025, month: 11 },
    { year: 2026, month: 0 },
    { year: 2026, month: 1 },
  ], database.event)

  assert.equal(getExchangeRates(2025, 11).source, '2025-11-01')
  assert.equal(getExchangeRates(2026, 0).source, '2026-01-01')
  assert.equal(getExchangeRates(2026, 1).source, '2026-03-01')
})

test('loading months reads months, entries and rates with three queries', async (context) => {
  prepareClock(context)
  const database = await createDatabaseWithRates([
    { date: '2026-01-01', rates: { USD: 1, GEL: 2.6 } },
    { date: '2026-02-01', rates: { USD: 1, GEL: 2.7 } },
  ])
  const db = useDatabase(database.event)
  await db.insert(user).values({ id: 'owner', username: 'owner@example.com', passwordHash: 'hash', mainCurrency: 'USD', createdAt: new Date() })
  await db.insert(month).values([
    { id: 'january', userId: 'owner', year: 2026, month: 0 },
    { id: 'february', userId: 'owner', year: 2026, month: 1 },
  ])
  await db.insert(entry).values([
    { id: 'savings', monthId: 'january', kind: 'balance', description: 'Savings', amount: 100, currency: 'USD' },
    { id: 'salary', monthId: 'february', kind: 'income', description: 'Salary', amount: 50, currency: 'GEL', date: '2026-02-10' },
  ])

  const queryCount = await countQueries(database, async () => {
    const months = await loadMonths('owner', [2026], database.event)
    assert.deepEqual(months.map(({ id, exchangeRatesSource, balanceSources, incomeEntries }) => ({
      id,
      exchangeRatesSource,
      balanceIds: balanceSources.map(source => source.id),
      incomeIds: incomeEntries.map(income => income.id),
    })), [
      { id: 'february', exchangeRatesSource: '2026-02-01', balanceIds: [], incomeIds: ['salary'] },
      { id: 'january', exchangeRatesSource: '2026-01-01', balanceIds: ['savings'], incomeIds: [] },
    ])
  })
  assert.equal(queryCount, 3)
})

test('creating a month fails before inserting budget data when rates are unavailable', async (context) => {
  prepareClock(context)
  const database = await createDatabaseWithRates()
  await assert.rejects(createMonth({
    year: 2025,
    month: 11,
    targetUserId: 'budget-owner',
    copyFromMonthId: 'previous-month',
  }, database.event), {
    statusCode: 503,
    message: 'serverErrors.failed_to_update_rates',
  })
  assert.equal(database.getQueries().some(query => query.startsWith('insert')), false)
})
