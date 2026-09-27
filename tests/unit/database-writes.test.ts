import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { useDatabase } from '../../server/db'
import { currency, entry, month, plan, user } from '../../server/db/schema'
import { createMonth } from '../../server/services/budget/months'
import { deletePlan, upsertPlan } from '../../server/services/budget/plans'
import { createUserInDb, findUser } from '../../server/utils/auth'
import { isUniqueConstraintError } from '../../server/utils/database-errors'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'
import { createTestDatabase, type TestDatabase } from './helpers/test-database'

const createDatabaseWithUsers = async (usernames: string[]): Promise<TestDatabase> => {
  const database = createTestDatabase()
  if (usernames.length > 0) {
    await useDatabase(database.event).insert(user).values(usernames.map(username => ({
      id: username.split('@')[0] ?? username,
      username,
      passwordHash: 'hash',
      mainCurrency: 'USD',
      createdAt: new Date(),
    })))
  }
  return database
}

const countRows = (database: TestDatabase, table: string): number =>
  Number(database.sqlite.prepare(`SELECT count(*) AS total FROM ${table}`).get()?.total)

const useFixedClock = (context: TestContext) => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-06T12:00:00Z') })
}

test('isUniqueConstraintError recognises a failed insert and a failed batch', async () => {
  const database = await createDatabaseWithUsers(['owner@example.com'])
  const db = useDatabase(database.event)
  const duplicateMonth = { id: 'second', userId: 'owner', year: 2026, month: 0 }
  await db.insert(month).values({ ...duplicateMonth, id: 'first' })

  const insertError = await db.insert(month).values(duplicateMonth).catch((error: unknown) => error)
  const batchError = await db.batch([db.insert(month).values(duplicateMonth)]).catch((error: unknown) => error)

  assert.equal(isUniqueConstraintError(insertError), true)
  assert.equal(isUniqueConstraintError(batchError), true)
  assert.equal(isUniqueConstraintError(new Error('FOREIGN KEY constraint failed')), false)
  assert.equal(isUniqueConstraintError('UNIQUE constraint failed'), false)
})

test('findUser ignores the case of stored and typed emails', async () => {
  const database = await createDatabaseWithUsers(['Alice@Example.com'])

  assert.equal((await findUser(' ALICE@example.COM ', database.event))?.username, 'Alice@Example.com')
  assert.equal(await findUser('bob@example.com', database.event), undefined)
})

test('createUserInDb stores the email in lowercase', async () => {
  const database = await createDatabaseWithUsers([])

  const created = await createUserInDb(database.event, { username: ' New.User@Example.com ', passwordHash: 'hash' })

  assert.equal(created.username, 'new.user@example.com')
  assert.equal(created.mainCurrency, 'USD')
})

test('createUserInDb answers 409 when the email is taken', async () => {
  const database = await createDatabaseWithUsers(['taken@example.com'])

  await assert.rejects(createUserInDb(database.event, { username: 'taken@example.com', passwordHash: 'hash' }), {
    statusCode: 409,
    message: ERROR_KEYS.USER_ALREADY_EXISTS,
  })
  assert.equal(countRows(database, 'user'), 1)
})

test('upsertPlan updates the plan of the same month instead of adding a second one', async () => {
  const database = await createDatabaseWithUsers(['owner@example.com'])

  const created = await upsertPlan('owner', 2026, 9, 100, 'Save', database.event)
  const updated = await upsertPlan('owner', 2026, 9, null, 'Rest', database.event)

  assert.equal(updated.id, created.id)
  assert.deepEqual(await useDatabase(database.event).select({
    id: plan.id,
    plannedBalanceChange: plan.plannedBalanceChange,
    comment: plan.comment,
  }).from(plan), [{ id: created.id, plannedBalanceChange: null, comment: 'Rest' }])
})

test('deletePlan says whether a plan was deleted', async () => {
  const database = await createDatabaseWithUsers(['owner@example.com'])
  await upsertPlan('owner', 2026, 9, 100, null, database.event)

  assert.equal(await deletePlan('owner', 2026, 9, database.event), true)
  assert.equal(await deletePlan('owner', 2026, 9, database.event), false)
  assert.equal(countRows(database, 'plan'), 0)
})

const createDatabaseWithMonths = async (): Promise<TestDatabase> => {
  const database = await createDatabaseWithUsers(['owner@example.com', 'stranger@example.com'])
  const db = useDatabase(database.event)
  await db.insert(currency).values({ date: '2026-10-01', rates: { USD: 1, GEL: 2.7 } })
  await db.insert(month).values([
    { id: 'september', userId: 'owner', year: 2026, month: 8 },
    { id: 'foreign', userId: 'stranger', year: 2026, month: 8 },
  ])
  await db.insert(entry).values([
    { id: 'savings', monthId: 'september', kind: 'balance', description: 'Savings', amount: 100, currency: 'USD' },
    { id: 'salary', monthId: 'september', kind: 'income', description: 'Salary', amount: 50, currency: 'GEL', date: '2026-09-10' },
  ])
  return database
}

test('createMonth copies only the balances of the source month', async (context) => {
  useFixedClock(context)
  const database = await createDatabaseWithMonths()

  const created = await createMonth({ year: 2026, month: 9, copyFromMonthId: 'september', targetUserId: 'owner' }, database.event)

  assert.deepEqual(created.balanceSources.map(({ description, amount, currency: currencyCode }) => ({ description, amount, currencyCode })), [
    { description: 'Savings', amount: 100, currencyCode: 'USD' },
  ])
  assert.deepEqual(created.incomeEntries, [])
  assert.equal(created.exchangeRatesSource, '2026-10-01')
  assert.equal(countRows(database, 'entry'), 3)
})

test('createMonth answers 409 for a month that already exists', async (context) => {
  useFixedClock(context)
  const database = await createDatabaseWithMonths()

  await assert.rejects(createMonth({ year: 2026, month: 8, targetUserId: 'owner' }, database.event), {
    statusCode: 409,
    message: ERROR_KEYS.MONTH_ALREADY_EXISTS,
  })
})

test('createMonth does not copy balances from a month of another user', async (context) => {
  useFixedClock(context)
  const database = await createDatabaseWithMonths()

  await assert.rejects(createMonth({ year: 2026, month: 9, copyFromMonthId: 'foreign', targetUserId: 'owner' }, database.event), {
    statusCode: 404,
    message: ERROR_KEYS.MONTH_NOT_FOUND,
  })
  assert.equal(countRows(database, 'month'), 2)
})
