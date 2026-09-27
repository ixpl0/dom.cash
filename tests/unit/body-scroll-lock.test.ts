import assert from 'node:assert/strict'
import { test } from 'node:test'
import { effectScope, nextTick, ref, type EffectScope, type Ref } from 'vue'
import { useBodyScrollLock } from '../../app/composables/shared/useBodyScrollLock'

const body = { style: { overflow: '' } }

Object.defineProperty(globalThis, 'document', { value: { body }, configurable: true })

const mountDialog = (isOpen: Ref<boolean>): EffectScope => {
  const scope = effectScope()
  scope.run(() => useBodyScrollLock(isOpen))
  return scope
}

test('keeps the page locked until the last open dialog closes', async () => {
  body.style.overflow = ''
  const isEntryModalOpen = ref(true)
  const isConfirmationOpen = ref(false)
  const entryModal = mountDialog(isEntryModalOpen)
  const confirmation = mountDialog(isConfirmationOpen)

  assert.equal(body.style.overflow, 'hidden')

  isConfirmationOpen.value = true
  await nextTick()
  assert.equal(body.style.overflow, 'hidden')

  isConfirmationOpen.value = false
  await nextTick()
  assert.equal(body.style.overflow, 'hidden')

  isEntryModalOpen.value = false
  await nextTick()
  assert.equal(body.style.overflow, '')

  entryModal.stop()
  confirmation.stop()
})

test('releases the lock when an open dialog unmounts', () => {
  body.style.overflow = ''
  const dialog = mountDialog(ref(true))

  assert.equal(body.style.overflow, 'hidden')

  dialog.stop()
  assert.equal(body.style.overflow, '')
})

test('keeps the lock when one of two open dialogs unmounts', () => {
  body.style.overflow = ''
  const entryModal = mountDialog(ref(true))
  const confirmation = mountDialog(ref(true))

  confirmation.stop()
  assert.equal(body.style.overflow, 'hidden')

  entryModal.stop()
  assert.equal(body.style.overflow, '')
})

test('restores the overflow value that was set before locking', async () => {
  body.style.overflow = 'clip'
  const isOpen = ref(true)
  const dialog = mountDialog(isOpen)

  assert.equal(body.style.overflow, 'hidden')

  isOpen.value = false
  await nextTick()
  assert.equal(body.style.overflow, 'clip')

  dialog.stop()
})
