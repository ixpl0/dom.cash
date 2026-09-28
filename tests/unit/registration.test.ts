import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isError } from 'h3'
import { assertRegistrationOpen, getRegistrationState, updateRegistration } from '../../server/services/auth/registration'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'
import { createTestDatabase } from './helpers/test-database'

const NOW = new Date('2026-09-28T12:00:00Z')

const minutesLater = (minutes: number): Date => new Date(NOW.getTime() + minutes * 60 * 1000)

test('registration is open until an admin changes it', async () => {
  const { event } = createTestDatabase()

  assert.deepEqual(await getRegistrationState(event, NOW), { isOpen: true, closesInSeconds: null })
  await assertRegistrationOpen(event)
})

test('closed registration refuses new users', async () => {
  const { event } = createTestDatabase()

  assert.deepEqual(await updateRegistration(event, 'closed', NOW), { isOpen: false, closesInSeconds: null })
  assert.deepEqual(await getRegistrationState(event, minutesLater(60)), { isOpen: false, closesInSeconds: null })
  await assert.rejects(assertRegistrationOpen(event), (error: unknown) => {
    assert.ok(isError(error))
    assert.equal(error.statusCode, 403)
    assert.equal(error.message, ERROR_KEYS.REGISTRATION_CLOSED)
    return true
  })
})

test('registration opened for 15 minutes closes by itself', async () => {
  const { event } = createTestDatabase()
  await updateRegistration(event, 'closed', NOW)

  assert.deepEqual(await updateRegistration(event, 'temporary', NOW), { isOpen: true, closesInSeconds: 900 })
  assert.deepEqual(await getRegistrationState(event, minutesLater(10)), { isOpen: true, closesInSeconds: 300 })
  assert.deepEqual(await getRegistrationState(event, minutesLater(15)), { isOpen: false, closesInSeconds: null })
})

test('opening registration for good stops the timer', async () => {
  const { event } = createTestDatabase()
  await updateRegistration(event, 'temporary', NOW)

  assert.deepEqual(await updateRegistration(event, 'open', minutesLater(5)), { isOpen: true, closesInSeconds: null })
  assert.deepEqual(await getRegistrationState(event, minutesLater(60)), { isOpen: true, closesInSeconds: null })
})

test('closing registration stops the timer', async () => {
  const { event } = createTestDatabase()
  await updateRegistration(event, 'temporary', NOW)

  assert.deepEqual(await updateRegistration(event, 'closed', minutesLater(5)), { isOpen: false, closesInSeconds: null })
  assert.deepEqual(await getRegistrationState(event, minutesLater(6)), { isOpen: false, closesInSeconds: null })
})
