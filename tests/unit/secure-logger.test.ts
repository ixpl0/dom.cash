import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sanitizeLogData } from '../../server/utils/secure-logger'

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
