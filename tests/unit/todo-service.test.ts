import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useDatabase } from '../../server/db'
import { budgetShare, todo, todoShare, user } from '../../server/db/schema'
import { countOverdueTodos, createTodo, deleteTodo, listTodos, toggleTodo, updateTodo } from '../../server/services/todo'
import { chunkArray, getRowsPerInsertStatement } from '../../server/utils/d1-limits'
import type { User } from '../../shared/types'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'
import { isTodoOverdue } from '../../shared/utils/todo'
import { createTestDatabase, type TestDatabase } from './helpers/test-database'

const toUser = (id: string): User => ({ id, username: `${id}@example.com`, mainCurrency: 'USD', isAdmin: false })

const owner = toUser('owner')
const friend = toUser('friend')
const stranger = toUser('stranger')

const createDatabaseWithFriends = async (friendIds: string[] = [friend.id]): Promise<TestDatabase> => {
  const database = createTestDatabase()
  const db = useDatabase(database.event)
  const userRows = [owner.id, stranger.id, ...friendIds].map(id => ({
    id,
    username: `${id}@example.com`,
    passwordHash: 'hash',
    mainCurrency: 'USD',
    createdAt: new Date(),
  }))
  const shareRows = friendIds.map(friendId => ({
    id: `share-${friendId}`,
    ownerId: friendId,
    sharedWithId: owner.id,
    access: 'read' as const,
    createdAt: new Date(),
  }))
  await Promise.all(chunkArray(userRows, getRowsPerInsertStatement(user)).map(rows => db.insert(user).values(rows)))
  await Promise.all(chunkArray(shareRows, getRowsPerInsertStatement(budgetShare)).map(rows => db.insert(budgetShare).values(rows)))
  return database
}

const readTodo = (database: TestDatabase, todoId: string) =>
  database.sqlite.prepare('SELECT is_completed AS isCompleted, planned_date AS plannedDate FROM todo WHERE id = ?').get(todoId)

const readSharedWithIds = (database: TestDatabase, todoId: string): string[] =>
  database.sqlite.prepare('SELECT shared_with_id AS id FROM todo_share WHERE todo_id = ? ORDER BY shared_with_id').all(todoId).map(row => String(row.id))

test('createTodo shares a task with connections once each', async () => {
  const database = await createDatabaseWithFriends()

  const created = await createTodo(owner, { content: 'Buy milk', sharedWithUserIds: [friend.id, friend.id] }, database.event)

  assert.deepEqual(created.sharedWith, [{ id: friend.id, username: friend.username }])
  assert.equal(created.isOwner, true)
  assert.deepEqual(readSharedWithIds(database, created.id), [friend.id])
})

test('createTodo rejects a user who is not a connection and writes nothing', async () => {
  const database = await createDatabaseWithFriends()

  await assert.rejects(createTodo(owner, { content: 'Secret', sharedWithUserIds: [stranger.id] }, database.event), {
    statusCode: 400,
    message: ERROR_KEYS.INVALID_SHARED_USER,
  })
  assert.equal(database.sqlite.prepare('SELECT count(*) AS total FROM todo').get()?.total, 0)
})

test('createTodo shares a task with more users than one insert can bind', async () => {
  const friendIds = Array.from({ length: 30 }, (_, index) => `friend${index}`)
  const database = await createDatabaseWithFriends(friendIds)

  const created = await createTodo(owner, { content: 'Party', sharedWithUserIds: friendIds }, database.event)

  assert.equal(created.sharedWith.length, 30)
  assert.equal(readSharedWithIds(database, created.id).length, 30)
})

test('updateTodo reopens a completed task that becomes recurring', async () => {
  const database = await createDatabaseWithFriends()
  const created = await createTodo(owner, { content: 'Water plants' }, database.event)
  await toggleTodo(owner, created.id, undefined, database.event)

  const updated = await updateTodo(owner, created.id, { recurrence: { type: 'interval', unit: 'week', value: 1 } }, database.event)

  assert.equal(updated.isCompleted, false)
  assert.deepEqual(updated.recurrence, { type: 'interval', unit: 'week', value: 1 })
  assert.equal(readTodo(database, created.id)?.isCompleted, 0)
})

test('toggleTodo moves a recurring task and stores it as not completed', async () => {
  const database = await createDatabaseWithFriends()
  const created = await createTodo(owner, {
    content: 'Pay rent',
    plannedDate: '2026-09-10T00:00',
    recurrence: { type: 'interval', unit: 'week', value: 1 },
  }, database.event)
  database.sqlite.prepare('UPDATE todo SET is_completed = 1 WHERE id = ?').run(created.id)

  const result = await toggleTodo(owner, created.id, 'planned', database.event)

  assert.deepEqual(result, { isCompleted: false, plannedDate: '2026-09-17T00:00', isRecurring: true })
  assert.deepEqual({ ...readTodo(database, created.id) }, { isCompleted: 0, plannedDate: '2026-09-17T00:00' })
})

test('updateTodo lets a participant edit the task but not its participants', async () => {
  const database = await createDatabaseWithFriends()
  const created = await createTodo(owner, { content: 'Plan trip', sharedWithUserIds: [friend.id] }, database.event)

  const updated = await updateTodo(friend, created.id, { content: 'Plan the trip' }, database.event)
  assert.equal(updated.content, 'Plan the trip')
  assert.equal(updated.isOwner, false)
  assert.equal(updated.ownerUsername, owner.username)
  assert.deepEqual(updated.sharedWith, [])

  await assert.rejects(updateTodo(friend, created.id, { sharedWithUserIds: [] }, database.event), {
    statusCode: 403,
    message: ERROR_KEYS.CANNOT_MODIFY_SHARE_AS_NON_OWNER,
  })
})

test('updateTodo keeps the participants when the new list is invalid', async () => {
  const database = await createDatabaseWithFriends()
  const created = await createTodo(owner, { content: 'Plan trip', sharedWithUserIds: [friend.id] }, database.event)

  await assert.rejects(updateTodo(owner, created.id, { content: 'Changed', sharedWithUserIds: [stranger.id] }, database.event), {
    statusCode: 400,
  })
  assert.deepEqual(readSharedWithIds(database, created.id), [friend.id])
  assert.equal((await listTodos(owner.id, database.event))[0]?.content, 'Plan trip')
})

test('updateTodo replaces the participants', async () => {
  const database = await createDatabaseWithFriends([friend.id, 'neighbour'])
  const created = await createTodo(owner, { content: 'Plan trip', sharedWithUserIds: [friend.id] }, database.event)

  const updated = await updateTodo(owner, created.id, { sharedWithUserIds: ['neighbour'] }, database.event)

  assert.deepEqual(updated.sharedWith.map(participant => participant.id), ['neighbour'])
  assert.deepEqual(readSharedWithIds(database, created.id), ['neighbour'])
})

test('deleteTodo is allowed to participants only', async () => {
  const database = await createDatabaseWithFriends()
  const created = await createTodo(owner, { content: 'Plan trip', sharedWithUserIds: [friend.id] }, database.event)

  await assert.rejects(deleteTodo(stranger, created.id, database.event), {
    statusCode: 403,
    message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_DELETE,
  })

  await deleteTodo(friend, created.id, database.event)
  assert.equal(database.sqlite.prepare('SELECT count(*) AS total FROM todo_share').get()?.total, 0)
  await assert.rejects(toggleTodo(owner, created.id, undefined, database.event), { statusCode: 404 })
})

test('listTodos shows own and shared tasks without the viewer among participants', async () => {
  const database = await createDatabaseWithFriends()
  await createTodo(owner, { content: 'Shared', sharedWithUserIds: [friend.id] }, database.event)
  await useDatabase(database.event).insert(todo).values({
    id: 'strangers-task',
    userId: stranger.id,
    content: 'Hidden',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const friendTodos = await listTodos(friend.id, database.event)

  assert.deepEqual(friendTodos.map(({ content, isOwner, ownerUsername, sharedWith }) => ({ content, isOwner, ownerUsername, sharedWith })), [
    { content: 'Shared', isOwner: false, ownerUsername: owner.username, sharedWith: [] },
  ])
  assert.equal((await listTodos(owner.id, database.event))[0]?.sharedWith[0]?.id, friend.id)
  assert.equal(await useDatabase(database.event).$count(todoShare), 1)
})

test('countOverdueTodos counts open visible tasks planned for the given day or earlier', async () => {
  const database = await createDatabaseWithFriends()
  const db = useDatabase(database.event)
  const createdAt = new Date()
  const toTaskRow = (id: string, userId: string, plannedDate: string | null, isCompleted: boolean | null) =>
    ({ id, userId, content: id, plannedDate, isCompleted, createdAt, updatedAt: createdAt })
  await db.insert(todo).values([
    toTaskRow('yesterday', owner.id, '2026-09-27T00:00', false),
    toTaskRow('this-morning', owner.id, '2026-09-28T00:00', false),
    toTaskRow('this-evening', owner.id, '2026-09-28T23:59', false),
    toTaskRow('tomorrow', owner.id, '2026-09-29T00:00', false),
    toTaskRow('completed', owner.id, '2026-09-01T00:00', true),
    toTaskRow('without-date', owner.id, null, false),
    toTaskRow('without-status', owner.id, '2026-09-02T00:00', null),
    toTaskRow('shared-by-friend', friend.id, '2026-09-03T00:00', false),
    toTaskRow('private-to-friend', friend.id, '2026-09-04T00:00', false),
    toTaskRow('strangers', stranger.id, '2026-09-05T00:00', false),
  ])
  await db.insert(todoShare).values({ id: 'share', todoId: 'shared-by-friend', sharedWithId: owner.id, createdAt })

  assert.equal(await countOverdueTodos(owner.id, '2026-09-28', database.event), 5)
  assert.equal(await countOverdueTodos(owner.id, '2026-09-26', database.event), 2)
  assert.equal(await countOverdueTodos(friend.id, '2026-09-28', database.event), 2)

  const ownerTodos = await listTodos(owner.id, database.event)
  assert.equal(ownerTodos.filter(item => isTodoOverdue(item, '2026-09-28')).length, 5)
})
