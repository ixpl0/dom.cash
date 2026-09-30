import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DrizzleQueryError } from 'drizzle-orm'
import { redactQueryErrors, sanitizeLogData } from '../../server/utils/secure-logger'

test('sanitizeLogData hides values of sensitive fields at any depth', () => {
  assert.deepEqual(sanitizeLogData({
    email: 'anna@example.com',
    password: 'hunter22',
    headers: { authorization: 'Bearer abc', cookie: 'auth-token=xyz' },
    apiKey: 'key-123',
    session: 'session-id',
  }), {
    email: 'anna@example.com',
    password: '[REDACTED]',
    headers: { authorization: '[REDACTED]', cookie: '[REDACTED]' },
    apiKey: '[REDACTED]',
    session: '[REDACTED]',
  })
})

test('sanitizeLogData keeps messages that only mention sensitive words', () => {
  assert.equal(sanitizeLogData('Failed to refresh the exchange rate key for USD'), 'Failed to refresh the exchange rate key for USD')
  assert.deepEqual(sanitizeLogData({ message: 'Token exchange failed', monthKey: '2026-09' }), {
    message: 'Token exchange failed',
    monthKey: '2026-09',
  })
})

test('sanitizeLogData keeps the name and message of an error', () => {
  const sanitized = sanitizeLogData(new TypeError('Invalid auth header'))
  assert.deepEqual({ ...(sanitized as Record<string, unknown>), stack: undefined }, {
    name: 'TypeError',
    message: 'Invalid auth header',
    stack: undefined,
  })
})

const createQueryError = (): DrizzleQueryError =>
  new DrizzleQueryError('insert into "user" ("username", "password") values (?, ?)', ['anna@example.com', 'hash-123'], new Error('D1_ERROR: UNIQUE constraint failed: user.username'))

test('sanitizeLogData keeps the query and the reason of a failed query but not its params', () => {
  const sanitized = sanitizeLogData(createQueryError()) as Record<string, string>
  assert.equal(sanitized.message, 'Failed query: insert into "user" ("username", "password") values (?, ?)\nreason: D1_ERROR: UNIQUE constraint failed: user.username')
  assert.ok(!sanitized.stack?.includes('anna@example.com'))
})

test('redactQueryErrors hides params in a failed query and in the error that wraps it', () => {
  const queryError = createQueryError()
  const wrapper = new Error(queryError.message, { cause: queryError })
  redactQueryErrors(wrapper)
  const logged = [wrapper.message, wrapper.stack, queryError.message, queryError.stack].join('\n')
  assert.ok(!logged.includes('anna@example.com'))
  assert.ok(!logged.includes('hash-123'))
  assert.ok(queryError.message.includes('UNIQUE constraint failed'))
})
