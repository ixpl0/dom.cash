import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useDatabase } from '../../server/db'
import { emailVerificationCode } from '../../server/db/schema'
import { verifyCode, VERIFICATION_CONFIG } from '../../server/utils/verification'
import { createTestDatabase, type TestDatabase } from './helpers/test-database'

const EMAIL = 'anna@example.com'
const CODE = '123456'
const WRONG_CODE = '654321'
const config = VERIFICATION_CONFIG.registration

const createDatabaseWithCode = async (): Promise<TestDatabase> => {
  const database = createTestDatabase()
  const now = new Date()
  await useDatabase(database.event).insert(emailVerificationCode).values({
    id: 'code-id',
    email: EMAIL,
    code: CODE,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    createdAt: now,
    lastSentAt: now,
  })
  return database
}

const readAttemptCount = (database: TestDatabase): unknown =>
  database.sqlite.prepare('SELECT verify_attempt_count AS count FROM email_verification_codes').get()?.count

test('verifyCode counts parallel wrong attempts and then rejects the right code', async () => {
  const database = await createDatabaseWithCode()

  const results = await Promise.all(Array.from({ length: 20 }, () =>
    verifyCode({ event: database.event, email: EMAIL, code: WRONG_CODE, config })))

  assert.equal(results.filter(result => !result.valid && result.reason === 'invalid_code').length, 2)
  assert.equal(readAttemptCount(database), 3)
  assert.deepEqual(
    await verifyCode({ event: database.event, email: EMAIL, code: CODE, config }),
    { valid: false, reason: 'max_attempts_exceeded' },
  )
})

test('verifyCode lets the right code through once', async () => {
  const database = await createDatabaseWithCode()

  const results = await Promise.all([1, 2].map(() =>
    verifyCode({ event: database.event, email: EMAIL, code: CODE, config })))

  assert.equal(results.filter(result => result.valid).length, 1)
  assert.equal(database.sqlite.prepare('SELECT count(*) AS total FROM email_verification_codes').get()?.total, 0)
})

test('verifyCode accepts the right code after a wrong one', async () => {
  const database = await createDatabaseWithCode()

  assert.deepEqual(await verifyCode({ event: database.event, email: EMAIL, code: WRONG_CODE, config }), { valid: false, reason: 'invalid_code' })
  assert.equal((await verifyCode({ event: database.event, email: EMAIL, code: CODE, config })).valid, true)
})
