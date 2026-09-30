import assert from 'node:assert/strict'
import { test } from 'node:test'
import impersonationGuard from '../../server/middleware/impersonation-guard'
import originGuard from '../../server/middleware/origin-guard'
import { IMPERSONATION_COOKIE } from '../../server/utils/impersonation'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'
import { createRequestEvent, routeThrough } from './helpers/request-event'

const HOST = 'domcash.ixplo.ai'
const SHARES_URL = '/api/budget/shares'

const crossOriginError = { statusCode: 403, message: ERROR_KEYS.CROSS_ORIGIN_REQUEST }
const readOnlyError = { statusCode: 403, message: ERROR_KEYS.IMPERSONATION_READ_ONLY }

const refusedHeaders: Array<{ name: string, headers: Record<string, string> }> = [
  { name: 'a sibling subdomain', headers: { 'sec-fetch-site': 'same-site', 'origin': 'https://blog.ixplo.ai' } },
  { name: 'another site', headers: { 'sec-fetch-site': 'cross-site', 'origin': 'https://example.com' } },
  { name: 'a sibling subdomain in a browser without fetch metadata', headers: { origin: 'https://blog.ixplo.ai' } },
  { name: 'the same host on another port', headers: { origin: `https://${HOST}:8443` } },
  { name: 'an opaque origin', headers: { origin: 'null' } },
  { name: 'a page that claims the same origin but is marked cross-site', headers: { 'sec-fetch-site': 'cross-site', 'origin': `https://${HOST}` } },
]

refusedHeaders.forEach(({ name, headers }) => {
  test(`a write request from ${name} is refused`, async () => {
    const event = createRequestEvent('POST', SHARES_URL, { host: HOST, ...headers })

    await assert.rejects(routeThrough(originGuard, event), crossOriginError)
  })
})

const acceptedHeaders: Array<{ name: string, headers: Record<string, string> }> = [
  { name: 'the same origin', headers: { 'sec-fetch-site': 'same-origin', 'origin': `https://${HOST}` } },
  { name: 'the user, not a page', headers: { 'sec-fetch-site': 'none' } },
  { name: 'the same origin in a browser without fetch metadata', headers: { origin: `https://${HOST.toUpperCase()}` } },
  { name: 'a client that is not a browser', headers: {} },
]

acceptedHeaders.forEach(({ name, headers }) => {
  test(`a write request from ${name} is accepted`, async () => {
    const event = createRequestEvent('POST', SHARES_URL, { host: HOST, ...headers })

    assert.equal(await routeThrough(originGuard, event), SHARES_URL)
  })
})

test('a write request from another site is refused on every path and method', async () => {
  const headers = { 'host': HOST, 'sec-fetch-site': 'cross-site' }

  await assert.rejects(routeThrough(originGuard, createRequestEvent('POST', '/%61pi/budget/shares', headers)), crossOriginError)
  await assert.rejects(routeThrough(originGuard, createRequestEvent('DELETE', '/api/todo/todo-id', headers)), crossOriginError)
  await assert.rejects(routeThrough(originGuard, createRequestEvent('PUT', '/budget', headers)), crossOriginError)
})

test('a page opened from another site is still served', async () => {
  const event = createRequestEvent('GET', '/budget', { 'host': HOST, 'sec-fetch-site': 'cross-site' })

  assert.equal(await routeThrough(originGuard, event), '/budget')
})

const impersonationHeaders = { cookie: `${IMPERSONATION_COOKIE}=user-id` }

const blockedWrites = [
  { method: 'POST', url: '/api/budget/entries' },
  { method: 'POST', url: '/%61pi/budget/entries' },
  { method: 'PUT', url: '/api/user/currency' },
  { method: 'DELETE', url: '/api/docs/folders/folder-id' },
  { method: 'POST', url: '/api/admin/impersonate' },
  { method: 'POST', url: '/api/auth/logout/extra' },
]

blockedWrites.forEach(({ method, url }) => {
  test(`${method} ${url} is refused while an admin views the site as a user`, async () => {
    await assert.rejects(routeThrough(impersonationGuard, createRequestEvent(method, url, impersonationHeaders)), readOnlyError)
  })
})

const allowedRequests = [
  { method: 'POST', url: '/api/auth/logout' },
  { method: 'DELETE', url: '/api/admin/impersonate' },
  { method: 'POST', url: '/api/notifications/subscribe/owner%40example.com' },
  { method: 'GET', url: '/api/budget' },
]

allowedRequests.forEach(({ method, url }) => {
  test(`${method} ${url} is allowed while an admin views the site as a user`, async () => {
    await assert.doesNotReject(routeThrough(impersonationGuard, createRequestEvent(method, url, impersonationHeaders)))
  })
})

test('writes are allowed without the impersonation cookie', async () => {
  assert.equal(await routeThrough(impersonationGuard, createRequestEvent('POST', '/api/budget/entries')), '/api/budget/entries')
})
