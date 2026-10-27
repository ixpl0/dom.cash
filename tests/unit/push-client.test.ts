import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseServiceWorkerMessage } from '../../app/utils/push'
import { appendErrorReason } from '../../app/utils/server-error'
import { toSupportedLocale } from '../../shared/utils/shared/locale'
import { FOREIGN_ADDRESSES } from './helpers/redirect-cases'

test('parseServiceWorkerMessage reads navigation inside the app', () => {
  assert.deepEqual(parseServiceWorkerMessage({ type: 'navigate', url: '/todo' }), { type: 'navigate', url: '/todo' })
})

test('parseServiceWorkerMessage ignores other messages and addresses outside the app', () => {
  assert.equal(parseServiceWorkerMessage(null), null)
  assert.equal(parseServiceWorkerMessage('navigate'), null)
  assert.deepEqual(
    FOREIGN_ADDRESSES.map(url => parseServiceWorkerMessage({ type: 'navigate', url })),
    FOREIGN_ADDRESSES.map(() => null),
  )
  assert.equal(parseServiceWorkerMessage({ type: 'navigate' }), null)
  assert.equal(parseServiceWorkerMessage({ type: 'reload' }), null)
})

test('appendErrorReason adds the reason a browser gave', () => {
  const pushError = new DOMException('Registration failed - push service not available', 'AbortError')

  assert.equal(appendErrorReason('Failed to turn on notifications', pushError), 'Failed to turn on notifications: AbortError: Registration failed - push service not available')
  assert.equal(appendErrorReason('Failed', new Error('Network down')), 'Failed: Network down')
  assert.equal(appendErrorReason('Failed', new Error('')), 'Failed')
  assert.equal(appendErrorReason('Failed', 'not an error'), 'Failed')
})

test('toSupportedLocale falls back to English', () => {
  assert.equal(toSupportedLocale('ru'), 'ru')
  assert.equal(toSupportedLocale('de'), 'en')
  assert.equal(toSupportedLocale(undefined), 'en')
})
