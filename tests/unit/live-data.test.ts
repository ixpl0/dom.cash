import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { NotificationEvent } from '../../shared/types/i18n'
import {
  formatNotificationMessage,
  getReconnectDelay,
  getStaleStores,
  isSilentNotification,
  parseServerMessage,
} from '../../app/utils/notifications'

const OWNER_ID = 'owner-id'

const createNotification = (overrides: Partial<NotificationEvent>): NotificationEvent => ({
  id: 'notification-id',
  type: 'budget_entry_created',
  params: {},
  budgetOwnerId: OWNER_ID,
  createdAt: '2026-09-28T10:00:00.000Z',
  ...overrides,
})

test('parseServerMessage reads service messages and notifications', () => {
  assert.deepEqual(parseServerMessage('{"type":"connected"}'), { type: 'connected' })
  assert.deepEqual(parseServerMessage('{"type":"ping"}'), { type: 'ping' })
  assert.equal(parseServerMessage(JSON.stringify(createNotification({})))?.type, 'budget_entry_created')
})

test('parseServerMessage ignores messages without a type', () => {
  assert.equal(parseServerMessage('{"data":1}'), null)
  assert.equal(parseServerMessage('42'), null)
  assert.equal(parseServerMessage('null'), null)
})

const reconnectCases = [
  { failedAttempts: 0, expected: 1000 },
  { failedAttempts: 1, expected: 5000 },
  { failedAttempts: 4, expected: 60000 },
  { failedAttempts: 20, expected: 60000 },
]

reconnectCases.forEach(({ failedAttempts, expected }) => {
  test(`getReconnectDelay waits ${expected} ms after ${failedAttempts} failed attempts`, () => {
    assert.equal(getReconnectDelay(failedAttempts), expected)
  })
})

const staleCases = [
  {
    name: 'an entry change marks the shown budget stale',
    notification: createNotification({ type: 'budget_entry_created' }),
    shownBudgetOwnerId: OWNER_ID,
    expected: { budget: true, todo: false, docs: false },
  },
  {
    name: 'an entry change in another budget marks nothing stale',
    notification: createNotification({ type: 'budget_entry_created', budgetOwnerId: 'other-owner' }),
    shownBudgetOwnerId: OWNER_ID,
    expected: { budget: false, todo: false, docs: false },
  },
  {
    name: 'a budget change marks nothing stale while no budget is shown',
    notification: createNotification({ type: 'budget_month_added' }),
    shownBudgetOwnerId: null,
    expected: { budget: false, todo: false, docs: false },
  },
  {
    name: 'a revoked share marks the shown budget and the connections of tasks and docs stale',
    notification: createNotification({ type: 'budget_share_revoked' }),
    shownBudgetOwnerId: OWNER_ID,
    expected: { budget: true, todo: true, docs: true },
  },
  {
    name: 'a task change marks only tasks stale',
    notification: createNotification({ type: 'todo_updated' }),
    shownBudgetOwnerId: OWNER_ID,
    expected: { budget: false, todo: true, docs: false },
  },
  {
    name: 'a docs change marks only docs stale',
    notification: createNotification({ type: 'docs_document_updated' }),
    shownBudgetOwnerId: OWNER_ID,
    expected: { budget: false, todo: false, docs: true },
  },
  {
    name: 'a silent photo change still marks docs stale',
    notification: createNotification({ type: 'docs_images_changed' }),
    shownBudgetOwnerId: null,
    expected: { budget: false, todo: false, docs: true },
  },
]

staleCases.forEach(({ name, notification, shownBudgetOwnerId, expected }) => {
  test(`getStaleStores: ${name}`, () => {
    assert.deepEqual(getStaleStores(notification, shownBudgetOwnerId), expected)
  })
})

test('formatNotificationMessage translates month, kind and task status', () => {
  const translate = (key: string, params?: Record<string, string | number>): string =>
    params ? `${key} ${JSON.stringify(params)}` : `[${key}]`

  const message = formatNotificationMessage(createNotification({
    type: 'budget_entry_created',
    params: { username: 'alice@example.com', month: 'march', kind: 'expense', amount: 0, isCompleted: false },
  }), translate)

  assert.equal(
    message,
    'notifications.budget_entry_created {"username":"alice@example.com","amount":0,"month":"[month.march]","kind":"[entryKind.expense]","isCompleted":"[todoStatus.incomplete]"}',
  )
})

test('formatNotificationMessage names an untitled document', () => {
  const translate = (key: string, params?: Record<string, string | number>): string =>
    params ? `${key} ${JSON.stringify(params)}` : `[${key}]`

  const message = formatNotificationMessage(createNotification({
    type: 'docs_document_created',
    params: { username: 'alice@example.com', folderName: 'Andrew', documentTitle: ' ' },
  }), translate)

  assert.equal(
    message,
    'notifications.docs_document_created {"username":"alice@example.com","folderName":"Andrew","documentTitle":"[docs.document.untitled]"}',
  )
})

test('isSilentNotification keeps photo changes out of toasts only', () => {
  assert.equal(isSilentNotification(createNotification({ type: 'docs_images_changed' })), true)
  assert.equal(isSilentNotification(createNotification({ type: 'docs_document_updated' })), false)
  assert.equal(isSilentNotification(createNotification({ type: 'todo_created' })), false)
})
