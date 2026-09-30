import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getRequestPath,
  isSessionLost,
  parseAuthMessage,
  shouldCheckSession,
  shouldReloadForAuthMessage,
} from '../../app/utils/session-sync'

const ORIGIN = 'https://dom.example'

test('parseAuthMessage reads sign-out and sign-in messages', () => {
  assert.deepEqual(parseAuthMessage({ type: 'signed-out' }), { type: 'signed-out' })
  assert.deepEqual(parseAuthMessage({ type: 'signed-in', userId: 'user-1' }), { type: 'signed-in', userId: 'user-1' })
})

test('parseAuthMessage ignores unknown data', () => {
  assert.equal(parseAuthMessage(null), null)
  assert.equal(parseAuthMessage('signed-out'), null)
  assert.equal(parseAuthMessage({ type: 'signed-in' }), null)
  assert.equal(parseAuthMessage({ type: 'other' }), null)
})

test('shouldReloadForAuthMessage reloads a signed-in tab after a sign-out', () => {
  assert.equal(shouldReloadForAuthMessage({ type: 'signed-out' }, 'user-1'), true)
  assert.equal(shouldReloadForAuthMessage({ type: 'signed-out' }, null), false)
})

test('shouldReloadForAuthMessage reloads only when another user signed in', () => {
  assert.equal(shouldReloadForAuthMessage({ type: 'signed-in', userId: 'user-1' }, 'user-1'), false)
  assert.equal(shouldReloadForAuthMessage({ type: 'signed-in', userId: 'user-2' }, 'user-1'), true)
  assert.equal(shouldReloadForAuthMessage({ type: 'signed-in', userId: 'user-1' }, null), true)
})

test('getRequestPath resolves relative and same-origin urls only', () => {
  assert.equal(getRequestPath('/api/todo?today=2026-09-30', ORIGIN), '/api/todo')
  assert.equal(getRequestPath(`${ORIGIN}/api/budget`, ORIGIN), '/api/budget')
  assert.equal(getRequestPath('https://other.example/api/todo', ORIGIN), null)
})

test('isSessionLost is true for a 401 of an api route while signed in', () => {
  assert.equal(isSessionLost({ requestUrl: '/api/todo', status: 401, isSignedIn: true }, ORIGIN), true)
  assert.equal(isSessionLost({ requestUrl: `${ORIGIN}/api/user/session`, status: 401, isSignedIn: true }, ORIGIN), true)
})

test('isSessionLost ignores other statuses and signed-out tabs', () => {
  assert.equal(isSessionLost({ requestUrl: '/api/todo', status: 403, isSignedIn: true }, ORIGIN), false)
  assert.equal(isSessionLost({ requestUrl: '/api/todo', status: undefined, isSignedIn: true }, ORIGIN), false)
  assert.equal(isSessionLost({ requestUrl: '/api/todo', status: 401, isSignedIn: false }, ORIGIN), false)
})

test('isSessionLost ignores auth routes, pages and other origins', () => {
  assert.equal(isSessionLost({ requestUrl: '/api/auth', status: 401, isSignedIn: true }, ORIGIN), false)
  assert.equal(isSessionLost({ requestUrl: '/api/auth/reset-password', status: 401, isSignedIn: true }, ORIGIN), false)
  assert.equal(isSessionLost({ requestUrl: '/api/authors', status: 401, isSignedIn: true }, ORIGIN), true)
  assert.equal(isSessionLost({ requestUrl: '/budget', status: 401, isSignedIn: true }, ORIGIN), false)
  assert.equal(isSessionLost({ requestUrl: 'https://other.example/api/todo', status: 401, isSignedIn: true }, ORIGIN), false)
})

test('shouldCheckSession waits for the second failure in a row', () => {
  assert.equal(shouldCheckSession(1), false)
  assert.equal(shouldCheckSession(2), true)
  assert.equal(shouldCheckSession(5), true)
})
