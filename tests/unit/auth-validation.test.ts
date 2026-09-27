import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getAuthFieldErrors } from '../../app/utils/auth-validation'

test('getAuthFieldErrors explains why an email is rejected', () => {
  assert.deepEqual(getAuthFieldErrors({ username: 'ab' }), { username: 'auth.usernameMinLength' })
  assert.deepEqual(getAuthFieldErrors({ username: `${'a'.repeat(60)}@mail.com` }), { username: 'auth.usernameMaxLength' })
  assert.deepEqual(getAuthFieldErrors({ username: 'not-an-email' }), { username: 'auth.usernameInvalid' })
  assert.deepEqual(getAuthFieldErrors({ username: ' Anna@Example.com ' }), {})
})

test('getAuthFieldErrors explains why a password is rejected', () => {
  assert.deepEqual(getAuthFieldErrors({ password: 'short' }), { password: 'auth.passwordMinLength' })
  assert.deepEqual(getAuthFieldErrors({ password: 'x'.repeat(101) }), { password: 'auth.passwordMaxLength' })
  assert.deepEqual(getAuthFieldErrors({ password: 'x'.repeat(8) }), {})
})

test('getAuthFieldErrors accepts only six digits as a code', () => {
  assert.deepEqual(getAuthFieldErrors({ code: '12345' }), { code: 'auth.verificationCodeInvalid' })
  assert.deepEqual(getAuthFieldErrors({ code: '12345a' }), { code: 'auth.verificationCodeInvalid' })
  assert.deepEqual(getAuthFieldErrors({ code: '123456' }), {})
})

test('getAuthFieldErrors checks only the given fields', () => {
  assert.deepEqual(getAuthFieldErrors({ username: 'anna@example.com', code: '' }), { code: 'auth.verificationCodeInvalid' })
  assert.deepEqual(getAuthFieldErrors({}), {})
})
