import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createContext, runInContext } from 'node:vm'
import { isAppPath, sanitizeRedirectPath } from '../../shared/utils/shared/redirect'
import { APP_PATH_CASES, FOREIGN_ADDRESSES, SITE_HOST } from './helpers/redirect-cases'

const serviceWorkerSource = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8')

const loadServiceWorker = () => {
  const context = createContext({
    self: { location: { origin: `https://${SITE_HOST}` }, addEventListener: () => undefined },
    URL,
  })
  runInContext(serviceWorkerSource, context)
  return context
}

test('the service worker opens only the paths that sanitizeRedirectPath keeps', () => {
  const context = loadServiceWorker()
  const addresses = APP_PATH_CASES.map(({ address }) => address).concat(FOREIGN_ADDRESSES)
  const openedPaths: unknown = runInContext(`JSON.stringify(${JSON.stringify(addresses)}.map(toAppPath))`, context)

  assert.equal(typeof openedPaths, 'string')
  assert.deepEqual(
    JSON.parse(String(openedPaths)),
    addresses.map(address => (isAppPath(address) ? sanitizeRedirectPath(address) : null)),
  )
})
