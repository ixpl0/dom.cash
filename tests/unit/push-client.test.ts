import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseServiceWorkerMessage } from '../../app/utils/push'
import { toSupportedLocale } from '../../shared/utils/shared/locale'

test('parseServiceWorkerMessage reads task changes and navigation inside the app', () => {
  assert.deepEqual(parseServiceWorkerMessage({ type: 'todo-changed' }), { type: 'todo-changed' })
  assert.deepEqual(parseServiceWorkerMessage({ type: 'navigate', url: '/todo' }), { type: 'navigate', url: '/todo' })
})

test('parseServiceWorkerMessage ignores other messages and addresses outside the app', () => {
  assert.equal(parseServiceWorkerMessage(null), null)
  assert.equal(parseServiceWorkerMessage('todo-changed'), null)
  assert.equal(parseServiceWorkerMessage({ type: 'navigate', url: 'https://example.com' }), null)
  assert.equal(parseServiceWorkerMessage({ type: 'navigate', url: '//example.com/todo' }), null)
  assert.equal(parseServiceWorkerMessage({ type: 'navigate' }), null)
  assert.equal(parseServiceWorkerMessage({ type: 'reload' }), null)
})

test('toSupportedLocale falls back to English', () => {
  assert.equal(toSupportedLocale('ru'), 'ru')
  assert.equal(toSupportedLocale('de'), 'en')
  assert.equal(toSupportedLocale(undefined), 'en')
})
