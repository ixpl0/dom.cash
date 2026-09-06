import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import type { H3Event } from 'h3'
import { createMonth, getExchangeRatesForMonth } from '../../server/services/budget/months'
import { hasCurrencyRates } from '../../server/utils/rates/database'

interface StoredRates {
  date: string
  rates: Record<string, number>
  lastUpdateAttempt?: number | null
}

const createDatabase = (initialRows: StoredRates[] = []) => {
  let rows = initialRows
  let queries: string[] = []

  const upsert = (record: StoredRates) => {
    rows = [...rows.filter(row => row.date !== record.date), record]
  }

  const prepare = (query: string) => ({
    bind: (...parameters: unknown[]) => ({
      raw: async () => {
        queries = [...queries, query]
        if (query.includes('from "month"')) {
          return []
        }

        const date = String(parameters[0])
        const eligibleRows = rows.filter((row) => {
          const matchesDate = query.includes('<= ?')
            ? row.date <= date
            : query.includes('>= ?')
              ? row.date >= date
              : row.date === date
          const values = Object.values(row.rates)
          const matchesRates = !query.includes('json_each')
            || (values.length > 0 && values.every(value => Number.isFinite(value) && value > 0))
          return matchesDate && matchesRates
        })
        const direction = query.includes(' desc') ? -1 : 1
        return [...eligibleRows]
          .sort((left, right) => direction * left.date.localeCompare(right.date))
          .slice(0, 1)
          .map(row => [row.date, JSON.stringify(row.rates), row.lastUpdateAttempt ?? null])
      },
      run: async () => {
        queries = [...queries, query]
        const date = String(parameters[0])
        const existingRow = rows.find(row => row.date === date)
        const rates = JSON.parse(String(parameters[1])) as Record<string, number>
        const lastUpdateAttempt = parameters[2] === null ? null : Number(parameters[2])
        upsert(existingRow
          ? query.includes('set "rates"')
            ? { ...existingRow, rates }
            : { ...existingRow, lastUpdateAttempt }
          : { date, rates, lastUpdateAttempt })
        return { success: true, meta: { duration: 0 } }
      },
    }),
  })

  const event = {
    context: { cloudflare: { env: { DB: { prepare } } } },
  } as unknown as H3Event

  return { event, upsert, getQueries: () => queries }
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
  const database = createDatabase([{ date: '2026-08-01', rates: { USD: 1, GEL: 2.7 } }])
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }))

  assert.deepEqual(await getExchangeRatesForMonth(2026, 8, database.event), {
    rates: { USD: 1, GEL: 2.7 }, source: '2026-08-01',
  })
  assert.equal(await hasCurrencyRates('2026-09-01', database.event), false)

  await getExchangeRatesForMonth(2026, 8, database.event)
  assert.equal(fetchMock.mock.callCount(), 1)

  context.mock.timers.tick(60 * 60 * 1000)
  fetchMock.mock.mockImplementation(async () => Response.json({ rates: { USD: 1, GEL: 2.8 } }))
  assert.deepEqual(await getExchangeRatesForMonth(2026, 8, database.event), {
    rates: { USD: 1, GEL: 2.8 }, source: '2026-09-01',
  })
  assert.equal(fetchMock.mock.callCount(), 2)
  assert.equal(await hasCurrencyRates('2026-09-01', database.event), true)
})

test('fallback skips empty and invalid records before applying the date limit', async (context) => {
  prepareClock(context)
  const database = createDatabase([
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
  const database = createDatabase([{ date: '2026-09-01', rates: { USD: 1, GEL: 2.7 } }])
  assert.equal((await getExchangeRatesForMonth(2026, 9, database.event)).source, '2026-09-01')

  database.upsert({ date: '2026-10-01', rates: { USD: 1, GEL: 2.8 } })
  const previousQueryCount = database.getQueries().length
  assert.deepEqual(await getExchangeRatesForMonth(2026, 9, database.event), {
    rates: { USD: 1, GEL: 2.8 }, source: '2026-10-01',
  })
  assert.equal(database.getQueries().length - previousQueryCount, 1)

  database.upsert({ date: '2026-10-01', rates: { USD: 1, GEL: 2.9 } })
  assert.equal((await getExchangeRatesForMonth(2026, 9, database.event)).rates.GEL, 2.9)
})

test('a future month starts updating when it becomes current after midnight UTC', async (context) => {
  prepareClock(context, '2026-09-30T23:59:00Z')
  const database = createDatabase([{ date: '2026-09-01', rates: { USD: 1, GEL: 2.7 } }])
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
  const database = createDatabase([{ date: '2025-12-01', rates: {} }])
  await assert.rejects(getExchangeRatesForMonth(2025, 11, database.event), {
    statusCode: 503,
    message: 'serverErrors.failed_to_update_rates',
  })

  database.upsert({ date: '2025-12-01', rates: { USD: 1, GEL: 2.7 } })
  assert.deepEqual(await getExchangeRatesForMonth(2025, 11, database.event), {
    rates: { USD: 1, GEL: 2.7 }, source: '2025-12-01',
  })
})

test('creating a month fails before inserting budget data when rates are unavailable', async (context) => {
  prepareClock(context)
  const database = createDatabase()
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
