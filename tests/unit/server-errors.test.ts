import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isError } from 'h3'
import { z } from 'zod'
import en from '../../i18n/locales/en'
import ru from '../../i18n/locales/ru'
import { readServerErrorData, readServerErrorKey } from '../../app/utils/server-error'
import { validateInput } from '../../server/utils/validation'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'

const SERVER_ERRORS_PREFIX = 'serverErrors.'

const errorKeyNames = Object.values(ERROR_KEYS).map(errorKey => errorKey.slice(SERVER_ERRORS_PREFIX.length))

const locales = { en, ru }

Object.entries(locales).forEach(([localeName, messages]) => {
  test(`every error key has a ${localeName} translation`, () => {
    assert.deepEqual(errorKeyNames.filter(name => !(name in messages.serverErrors)), [])
  })

  test(`every ${localeName} server error translation belongs to an error key`, () => {
    assert.deepEqual(Object.keys(messages.serverErrors).filter(name => !errorKeyNames.includes(name)), [])
  })
})

test('every error key starts with the serverErrors prefix', () => {
  assert.deepEqual(Object.values(ERROR_KEYS).filter(errorKey => !errorKey.startsWith(SERVER_ERRORS_PREFIX)), [])
})

const readCases = [
  {
    name: 'the key from the body of a failed request',
    error: { message: '[POST] "/api/budget/entries": 404 Not Found', data: { message: ERROR_KEYS.ENTRY_NOT_FOUND } },
    expected: ERROR_KEYS.ENTRY_NOT_FOUND,
  },
  {
    name: 'the key kept as the message of a load error',
    error: { message: ERROR_KEYS.ACCESS_DENIED },
    expected: ERROR_KEYS.ACCESS_DENIED,
  },
  {
    name: 'nothing from a raw validation message',
    error: { data: { message: 'Too big: expected string to have <=255 characters' } },
    expected: null,
  },
  {
    name: 'nothing from a message with an unknown serverErrors key',
    error: { data: { message: 'serverErrors.missing_key' } },
    expected: null,
  },
  {
    name: 'nothing from the message of a failed request without a key',
    error: new Error('[GET] "/api/budget": 500 Internal Server Error'),
    expected: null,
  },
  {
    name: 'nothing from an empty load error',
    error: { message: '' },
    expected: null,
  },
  {
    name: 'nothing from a string',
    error: ERROR_KEYS.ACCESS_DENIED,
    expected: null,
  },
  {
    name: 'nothing from null',
    error: null,
    expected: null,
  },
]

readCases.forEach(({ name, error, expected }) => {
  test(`readServerErrorKey reads ${name}`, () => {
    assert.equal(readServerErrorKey(error), expected)
  })
})

const nameSchema = z.object({
  profile: z.object({
    name: z.string().max(3),
  }),
})

test('validateInput returns the parsed input', () => {
  assert.deepEqual(validateInput({ profile: { name: 'Bob' } }, nameSchema, ERROR_KEYS.VALIDATION_FAILED), { profile: { name: 'Bob' } })
})

test('validateInput rejects invalid input with the error key and the failed fields', () => {
  assert.throws(
    () => validateInput({ profile: { name: 'Alice' } }, nameSchema, ERROR_KEYS.INVALID_QUERY_PARAMETERS),
    (error: unknown) => {
      assert.ok(isError<{ issues: Array<{ path: string }> }>(error))
      assert.equal(error.statusCode, 400)
      assert.equal(error.message, ERROR_KEYS.INVALID_QUERY_PARAMETERS)
      assert.deepEqual(error.data?.issues.map(issue => issue.path), ['profile.name'])
      return true
    },
  )
})

test('readServerErrorData reads the data a route attached to its error', () => {
  const importResult = { success: false, importedMonths: 1 }
  assert.deepEqual(readServerErrorData({ data: { message: 'serverErrors.importFailed', data: importResult } }), importResult)
  assert.equal(readServerErrorData(new Error('Network failure')), undefined)
})
