import assert from 'node:assert/strict'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { test, type TestContext } from 'node:test'
import { createEvent } from 'h3'
import {
  addConnection,
  createNotification,
  removeConnection,
  subscribeToBudget,
  unsubscribeFromBudget,
} from '../../server/services/notifications'

interface SharedBudget {
  ownerId: string
  userId: string
  access: 'read' | 'write'
}

const unsupportedDatabaseCall = (): never => {
  throw new Error('Unexpected database operation')
}

const createDatabaseEvent = (getShares: () => readonly SharedBudget[]) => {
  const prepareStatement = (parameters: readonly unknown[] = []): D1PreparedStatement => ({
    bind: (...values) => prepareStatement(values),
    raw: async <T>() => {
      const rows: unknown[] = getShares()
        .filter(share => share.ownerId === parameters[0])
        .map(share => [share.userId])

      return rows as T[]
    },
    first: unsupportedDatabaseCall,
    run: unsupportedDatabaseCall,
    all: unsupportedDatabaseCall,
  })

  const database: D1Database = {
    prepare: () => prepareStatement(),
    dump: unsupportedDatabaseCall,
    batch: unsupportedDatabaseCall,
    exec: unsupportedDatabaseCall,
  }
  const request = new IncomingMessage(new Socket())
  const event = createEvent(request, new ServerResponse(request))
  event.context.cloudflare = { env: { DB: database } }

  return event
}

const listen = (context: TestContext, userId: string) => {
  const connectionId = crypto.randomUUID()
  let messages: readonly string[] = []

  addConnection(userId, connectionId, {
    write: (message) => {
      messages = messages.concat(message)
    },
    close: () => {},
  })
  context.after(() => removeConnection(userId, connectionId))

  return () => messages
}

test('financial notifications reach the owner and current readers and writers only', async (context) => {
  const ownerId = crypto.randomUUID()
  const readerId = crypto.randomUUID()
  const writerId = crypto.randomUUID()
  const unrelatedUserId = crypto.randomUUID()
  const ownerMessages = listen(context, ownerId)
  const readerMessages = listen(context, readerId)
  const writerMessages = listen(context, writerId)
  const unrelatedMessages = listen(context, unrelatedUserId)
  const event = createDatabaseEvent(() => [
    { ownerId, userId: readerId, access: 'read' },
    { ownerId, userId: writerId, access: 'write' },
    { ownerId: crypto.randomUUID(), userId: unrelatedUserId, access: 'write' },
  ])

  for (const userId of [readerId, writerId, unrelatedUserId]) {
    subscribeToBudget(userId, ownerId)
  }

  await createNotification(event, {
    sourceUserId: crypto.randomUUID(),
    budgetOwnerId: ownerId,
    type: 'budget_entry_created',
    params: { description: 'Private salary', amount: 500000, entryCurrency: 'USD' },
  })

  assert.equal(ownerMessages().length, 1)
  assert.equal(readerMessages().length, 1)
  assert.equal(writerMessages().length, 1)
  assert.equal(unrelatedMessages().length, 0)
})

test('revoking access blocks an existing subscription without disconnecting its stream', async (context) => {
  const ownerId = crypto.randomUUID()
  const viewerId = crypto.randomUUID()
  const receivedMessages = listen(context, viewerId)
  let shares: readonly SharedBudget[] = [{ ownerId, userId: viewerId, access: 'read' }]
  const event = createDatabaseEvent(() => shares)
  const notification = {
    sourceUserId: ownerId,
    budgetOwnerId: ownerId,
    type: 'budget_entry_created' as const,
    params: { description: 'Private salary', amount: 500000, entryCurrency: 'USD' },
  }

  subscribeToBudget(viewerId, ownerId)
  await createNotification(event, notification)
  assert.equal(receivedMessages().length, 1)

  shares = []
  await createNotification(event, notification)
  assert.equal(receivedMessages().length, 1)

  await createNotification(event, { ...notification, targetUserId: viewerId })
  assert.equal(receivedMessages().length, 1)
})

test('unsubscribing removes the recipient even while a budget share still exists', async (context) => {
  const ownerId = crypto.randomUUID()
  const viewerId = crypto.randomUUID()
  const receivedMessages = listen(context, viewerId)
  const event = createDatabaseEvent(() => [{ ownerId, userId: viewerId, access: 'read' }])

  subscribeToBudget(viewerId, ownerId)
  unsubscribeFromBudget(viewerId, ownerId)
  await createNotification(event, {
    sourceUserId: ownerId,
    budgetOwnerId: ownerId,
    type: 'budget_currency_changed',
    params: { currency: 'EUR' },
  })

  assert.equal(receivedMessages().length, 0)
})

test('revocation notices and direct todo notifications remain deliverable without budget access', async (context) => {
  const ownerId = crypto.randomUUID()
  const viewerId = crypto.randomUUID()
  const receivedMessages = listen(context, viewerId)
  const event = createDatabaseEvent(unsupportedDatabaseCall)

  await createNotification(event, {
    sourceUserId: ownerId,
    budgetOwnerId: ownerId,
    targetUserId: viewerId,
    type: 'budget_share_revoked',
    params: { username: 'owner@example.com' },
  })
  await createNotification(event, {
    sourceUserId: ownerId,
    budgetOwnerId: ownerId,
    targetUserId: viewerId,
    type: 'todo_updated',
    params: { todoContent: 'Shared task' },
  })

  assert.equal(receivedMessages().length, 2)
})

test('failed permission checks never deliver financial notifications', async (context) => {
  const ownerId = crypto.randomUUID()
  const viewerId = crypto.randomUUID()
  const receivedMessages = listen(context, viewerId)
  const event = createDatabaseEvent(() => {
    throw new Error('Database unavailable')
  })

  subscribeToBudget(viewerId, ownerId)
  await assert.rejects(createNotification(event, {
    sourceUserId: ownerId,
    budgetOwnerId: ownerId,
    type: 'budget_entry_deleted',
    params: { description: 'Private expense', amount: 1200 },
  }))

  assert.equal(receivedMessages().length, 0)
})
