import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { NotificationEvent } from '../../shared/types/i18n'
import {
  formatNotificationMessage,
  getReconnectDelay,
  getStaleStores,
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
    expected: { budget: true, todo: false },
  },
  {
    name: 'an entry change in another budget marks nothing stale',
    notification: createNotification({ type: 'budget_entry_created', budgetOwnerId: 'other-owner' }),
    shownBudgetOwnerId: OWNER_ID,
    expected: { budget: false, todo: false },
  },
  {
    name: 'a budget change marks nothing stale while no budget is shown',
    notification: createNotification({ type: 'budget_month_added' }),
    shownBudgetOwnerId: null,
    expected: { budget: false, todo: false },
  },
  {
    name: 'a revoked share marks the shown budget and the task connections stale',
    notification: createNotification({ type: 'budget_share_revoked' }),
    shownBudgetOwnerId: OWNER_ID,
    expected: { budget: true, todo: true },
  },
  {
    name: 'a task change marks only tasks stale',
    notification: createNotification({ type: 'todo_updated' }),
    shownBudgetOwnerId: OWNER_ID,
    expected: { budget: false, todo: true },
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
