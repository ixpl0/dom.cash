import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sanitizeRedirectPath } from '../../shared/utils/shared/redirect'
import { APP_PATH_CASES, FOREIGN_ADDRESSES } from './helpers/redirect-cases'

test('sanitizeRedirectPath keeps paths of the app and resolves their dot segments', () => {
  assert.deepEqual(
    APP_PATH_CASES.map(({ address }) => sanitizeRedirectPath(address)),
    APP_PATH_CASES.map(({ path }) => path),
  )
})

test('sanitizeRedirectPath sends every address that leaves the app to the home page', () => {
  assert.deepEqual(FOREIGN_ADDRESSES.map(sanitizeRedirectPath), FOREIGN_ADDRESSES.map(() => '/'))
})

test('sanitizeRedirectPath sends a missing address to the home page', () => {
  assert.equal(sanitizeRedirectPath(undefined), '/')
  assert.equal(sanitizeRedirectPath(null), '/')
  assert.equal(sanitizeRedirectPath(['/budget']), '/')
})
