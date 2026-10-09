import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { useDatabase } from '../../server/db'
import { session, todo, todoShare, user } from '../../server/db/schema'
import { getPushPublicKey, getTodoDigestSettings, readVapidKeys, removePushDevice, savePushDevice, sendTestPush, updateTodoDigestSettings } from '../../server/services/push'
import { sendTodoDigests } from '../../server/services/todo-digest'
import type { AuthSession } from '../../server/utils/session'
import type { PushOptions, PushResult, PushSender, PushTarget } from '../../server/utils/web-push'
import { DEFAULT_TODO_DIGEST_SETTINGS } from '../../shared/schemas/push'
import type { PushDevice, PushMessage } from '../../shared/types/push'
import { encodeBase64Url } from '../../shared/utils/shared/base64url'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'
import { createTestDatabase, type TestDatabase } from './helpers/test-database'

interface SentPush {
  endpoint: string
  message: PushMessage
  options: PushOptions
}

interface FakeSender {
  send: PushSender
  getSent: () => SentPush[]
}

const OWNER_ID = 'owner'
const FRIEND_ID = 'friend'
const MOSCOW_NINE_AM = new Date('2026-10-09T06:00:00Z')
const MOSCOW_TODAY = '2026-10-09'
const PHONE_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/phone'
const LAPTOP_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/laptop'

const toAuthSession = (userId: string, sessionId = `session-${userId}`): AuthSession => ({
  sessionId,
  user: { id: userId, username: `${userId}@example.com`, mainCurrency: 'USD', isAdmin: false },
})

const createDevice = (endpoint: string, overrides: Partial<PushDevice> = {}): PushDevice => ({
  endpoint,
  keys: { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' },
  timeZone: 'Europe/Moscow',
  locale: 'en',
  ...overrides,
})

const createSessionRow = (userId: string, id = `session-${userId}`) => ({
  id,
  userId,
  tokenHash: `hash-${id}`,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  expiresAt: new Date('2026-12-30T00:00:00Z'),
})

const createDatabaseWithUsers = async (): Promise<TestDatabase> => {
  const database = createTestDatabase()
  const db = useDatabase(database.event)
  await db.insert(user).values([OWNER_ID, FRIEND_ID].map(id => ({
    id,
    username: `${id}@example.com`,
    passwordHash: 'hash',
    mainCurrency: 'USD',
    createdAt: new Date('2026-10-01T00:00:00Z'),
  })))
  await db.insert(session).values([createSessionRow(OWNER_ID), createSessionRow(FRIEND_ID)])
  return database
}

const addTodo = async (database: TestDatabase, id: string, plannedDate: string | null, overrides: Partial<typeof todo.$inferInsert> = {}): Promise<void> => {
  await useDatabase(database.event).insert(todo).values({
    id,
    userId: OWNER_ID,
    content: `Task ${id}`,
    isCompleted: false,
    plannedDate,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  })
}

const createFakeSender = (resultFor: (target: PushTarget) => PushResult = () => ({ status: 201, isDelivered: true, isGone: false })): FakeSender => {
  let sent: SentPush[] = []
  return {
    send: async (target, message, options) => {
      sent = [...sent, { endpoint: target.endpoint, message: message as PushMessage, options }]
      return resultFor(target)
    },
    getSent: () => sent,
  }
}

const readEndpoints = (database: TestDatabase): string[] =>
  database.sqlite.prepare('SELECT endpoint FROM push_subscription ORDER BY endpoint').all().map(row => String(row.endpoint))

const readDeviceSettings = (database: TestDatabase, userId: string) =>
  ({ ...database.sqlite.prepare('SELECT time_zone AS timeZone, locale FROM todo_digest_settings WHERE user_id = ?').get(userId) })

const readSubscriptionOwners = (database: TestDatabase) =>
  database.sqlite.prepare('SELECT user_id AS userId, session_id AS sessionId FROM push_subscription').all().map(row => ({ ...row }))

const readLastSentDate = (database: TestDatabase, userId: string): unknown =>
  database.sqlite.prepare('SELECT last_sent_date AS lastSentDate FROM todo_digest_settings WHERE user_id = ?').get(userId)?.lastSentDate

const NINE_AM_SETTINGS = { ...DEFAULT_TODO_DIGEST_SETTINGS, digestTime: 9 * 60 }

const subscribeOwner = async (database: TestDatabase, settings = NINE_AM_SETTINGS): Promise<void> => {
  const db = useDatabase(database.event)
  await savePushDevice(toAuthSession(OWNER_ID), createDevice(PHONE_ENDPOINT), db, MOSCOW_NINE_AM)
  await updateTodoDigestSettings(OWNER_ID, settings, db)
}

const useVapidKeys = async (context: TestContext): Promise<void> => {
  const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])
  const previousKeys = [process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY]
  process.env.VAPID_PUBLIC_KEY = encodeBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', publicKey)))
  process.env.VAPID_PRIVATE_KEY = (await crypto.subtle.exportKey('jwk', privateKey)).d
  context.after(() => {
    const [previousPublicKey, previousPrivateKey] = previousKeys
    process.env.VAPID_PUBLIC_KEY = previousPublicKey ?? ''
    process.env.VAPID_PRIVATE_KEY = previousPrivateKey ?? ''
  })
}

const useFakePushService = (context: TestContext, status: number): (() => string[]) => {
  const previousFetch = globalThis.fetch
  let urls: string[] = []
  globalThis.fetch = async (input: string | URL | Request): Promise<Response> => {
    urls = [...urls, new Request(input).url]
    return new Response(null, { status })
  }
  context.after(() => {
    globalThis.fetch = previousFetch
  })
  return () => urls
}

test('savePushDevice stores the device and the time zone with default digest settings', async () => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)

  await savePushDevice(toAuthSession(OWNER_ID), createDevice(PHONE_ENDPOINT, { locale: 'ru' }), db, MOSCOW_NINE_AM)

  assert.deepEqual(readEndpoints(database), [PHONE_ENDPOINT])
  assert.deepEqual(await getTodoDigestSettings(OWNER_ID, db), DEFAULT_TODO_DIGEST_SETTINGS)
  assert.deepEqual(readDeviceSettings(database, OWNER_ID), { timeZone: 'Europe/Moscow', locale: 'ru' })
})

test('savePushDevice keeps the schedule and moves a device to whoever subscribes it again', async () => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  const settings = { digestTime: 7 * 60 + 30, weekdays: [1, 2, 3, 4, 5], overdueMode: 'daily' } as const
  await savePushDevice(toAuthSession(OWNER_ID), createDevice(PHONE_ENDPOINT), db, MOSCOW_NINE_AM)
  await updateTodoDigestSettings(OWNER_ID, { ...settings, weekdays: [...settings.weekdays] }, db)

  await savePushDevice(toAuthSession(OWNER_ID), createDevice(PHONE_ENDPOINT, { timeZone: 'Asia/Tbilisi', locale: undefined }), db, MOSCOW_NINE_AM)
  await savePushDevice(toAuthSession(FRIEND_ID), createDevice(PHONE_ENDPOINT), db, MOSCOW_NINE_AM)

  assert.deepEqual(await getTodoDigestSettings(OWNER_ID, db), settings)
  assert.deepEqual(readDeviceSettings(database, OWNER_ID), { timeZone: 'Asia/Tbilisi', locale: 'en' })
  assert.deepEqual(readSubscriptionOwners(database), [{ userId: FRIEND_ID, sessionId: `session-${FRIEND_ID}` }])
})

test('removePushDevice deletes only a device of the same user', async () => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await savePushDevice(toAuthSession(OWNER_ID), createDevice(PHONE_ENDPOINT), db, MOSCOW_NINE_AM)

  await removePushDevice(FRIEND_ID, PHONE_ENDPOINT, db)
  assert.deepEqual(readEndpoints(database), [PHONE_ENDPOINT])

  await removePushDevice(OWNER_ID, PHONE_ENDPOINT, db)
  assert.deepEqual(readEndpoints(database), [])
})

test('an ended session takes its devices with it', async () => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await savePushDevice(toAuthSession(OWNER_ID), createDevice(PHONE_ENDPOINT), db, MOSCOW_NINE_AM)

  database.sqlite.prepare('DELETE FROM session WHERE id = ?').run(`session-${OWNER_ID}`)

  assert.deepEqual(readEndpoints(database), [])
})

test('sendTestPush encrypts a message for the device and refuses devices of other users', async (context) => {
  await useVapidKeys(context)
  const getUrls = useFakePushService(context, 201)
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await savePushDevice(toAuthSession(OWNER_ID), createDevice(PHONE_ENDPOINT), db, MOSCOW_NINE_AM)

  assert.deepEqual(await sendTestPush(OWNER_ID, PHONE_ENDPOINT, db, MOSCOW_NINE_AM), { deliveredCount: 1 })
  assert.deepEqual(getUrls(), [PHONE_ENDPOINT])
  await assert.rejects(sendTestPush(FRIEND_ID, PHONE_ENDPOINT, db, MOSCOW_NINE_AM), {
    statusCode: 404,
    message: ERROR_KEYS.PUSH_SUBSCRIPTION_NOT_FOUND,
  })
})

test('sendTestPush forgets a device that the push service no longer knows', async (context) => {
  await useVapidKeys(context)
  useFakePushService(context, 410)
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await savePushDevice(toAuthSession(OWNER_ID), createDevice(PHONE_ENDPOINT), db, MOSCOW_NINE_AM)

  await assert.rejects(sendTestPush(OWNER_ID, PHONE_ENDPOINT, db, MOSCOW_NINE_AM), {
    statusCode: 404,
    message: ERROR_KEYS.PUSH_SUBSCRIPTION_NOT_FOUND,
  })
  assert.deepEqual(readEndpoints(database), [])
})

test('sendTestPush reports a push service that refuses the message', async (context) => {
  await useVapidKeys(context)
  useFakePushService(context, 403)
  context.mock.method(console, 'warn', () => {})
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await savePushDevice(toAuthSession(OWNER_ID), createDevice(PHONE_ENDPOINT), db, MOSCOW_NINE_AM)

  await assert.rejects(sendTestPush(OWNER_ID, PHONE_ENDPOINT, db, MOSCOW_NINE_AM), {
    statusCode: 502,
    message: ERROR_KEYS.PUSH_DELIVERY_FAILED,
  })
  assert.deepEqual(readEndpoints(database), [PHONE_ENDPOINT])
})

test('broken VAPID secrets turn push notifications off and say why in the log', async (context) => {
  const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])
  const previousKeys = [process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY]
  process.env.VAPID_PUBLIC_KEY = `VAPID_PUBLIC_KEY=${encodeBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', publicKey)))}`
  process.env.VAPID_PRIVATE_KEY = (await crypto.subtle.exportKey('jwk', privateKey)).d
  context.after(() => {
    process.env.VAPID_PUBLIC_KEY = previousKeys[0] ?? ''
    process.env.VAPID_PRIVATE_KEY = previousKeys[1] ?? ''
  })
  const errorLog = context.mock.method(console, 'error', () => {})
  const database = await createDatabaseWithUsers()

  assert.equal(readVapidKeys(), null)
  assert.equal(getPushPublicKey(), null)
  await assert.rejects(sendTestPush(OWNER_ID, PHONE_ENDPOINT, useDatabase(database.event), MOSCOW_NINE_AM), {
    statusCode: 503,
    message: ERROR_KEYS.PUSH_NOT_CONFIGURED,
  })
  assert.match(String(errorLog.mock.calls[0]?.arguments[0]), /VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY/)
})

test('sendTestPush needs VAPID keys outside test mode', async (context) => {
  const previousKeys = [process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY]
  process.env.VAPID_PUBLIC_KEY = ''
  process.env.VAPID_PRIVATE_KEY = ''
  context.after(() => {
    process.env.VAPID_PUBLIC_KEY = previousKeys[0] ?? ''
    process.env.VAPID_PRIVATE_KEY = previousKeys[1] ?? ''
  })
  const database = await createDatabaseWithUsers()

  await assert.rejects(sendTestPush(OWNER_ID, PHONE_ENDPOINT, useDatabase(database.event), MOSCOW_NINE_AM), {
    statusCode: 503,
    message: ERROR_KEYS.PUSH_NOT_CONFIGURED,
  })
})

test('sendTodoDigests sends the digest at the local digest time once a day', async () => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await subscribeOwner(database)
  await addTodo(database, 'today', `${MOSCOW_TODAY}T00:00`)
  await addTodo(database, 'overdue', '2026-10-06T00:00')
  await addTodo(database, 'tomorrow', '2026-10-10T00:00')
  await addTodo(database, 'done', `${MOSCOW_TODAY}T00:00`, { isCompleted: true })
  await addTodo(database, 'someday', null)
  const sender = createFakeSender()

  assert.deepEqual(await sendTodoDigests(db, new Date('2026-10-09T05:45:00Z'), sender.send), { userCount: 0, deliveredCount: 0, goneCount: 0 })
  assert.deepEqual(await sendTodoDigests(db, MOSCOW_NINE_AM, sender.send), { userCount: 1, deliveredCount: 1, goneCount: 0 })
  assert.deepEqual(await sendTodoDigests(db, new Date('2026-10-09T06:15:00Z'), sender.send), { userCount: 0, deliveredCount: 0, goneCount: 0 })

  assert.deepEqual(sender.getSent(), [{
    endpoint: PHONE_ENDPOINT,
    message: {
      title: '1 task for today',
      body: 'Task today\nTask overdue · 3 days ago',
      tag: 'todo-digest',
      url: '/todo',
      isSilent: true,
      todo: null,
      actions: [],
    },
    options: { ttlSeconds: 12 * 60 * 60, urgency: 'normal', topic: 'todo-digest' },
  }])
  assert.equal(readLastSentDate(database, OWNER_ID), MOSCOW_TODAY)
})

test('sendTodoDigests sends one digest when two runs overlap', async () => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await subscribeOwner(database)
  await addTodo(database, 'today', `${MOSCOW_TODAY}T00:00`)
  const sender = createFakeSender()

  const results = await Promise.all([
    sendTodoDigests(db, MOSCOW_NINE_AM, sender.send),
    sendTodoDigests(db, MOSCOW_NINE_AM, sender.send),
  ])

  assert.deepEqual(results.map(result => result.userCount).sort(), [0, 1])
  assert.equal(sender.getSent().length, 1)
})

test('sendTodoDigests marks the day even when there is nothing to say', async () => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await subscribeOwner(database)
  await addTodo(database, 'tomorrow', '2026-10-10T00:00')
  const sender = createFakeSender()

  assert.deepEqual(await sendTodoDigests(db, MOSCOW_NINE_AM, sender.send), { userCount: 1, deliveredCount: 0, goneCount: 0 })
  assert.deepEqual(sender.getSent(), [])
  assert.equal(readLastSentDate(database, OWNER_ID), MOSCOW_TODAY)
})

test('sendTodoDigests skips days that are not chosen', async () => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await subscribeOwner(database, { ...NINE_AM_SETTINGS, weekdays: [1, 2, 3, 4] })
  await addTodo(database, 'today', `${MOSCOW_TODAY}T00:00`)
  const sender = createFakeSender()

  assert.deepEqual(await sendTodoDigests(db, MOSCOW_NINE_AM, sender.send), { userCount: 0, deliveredCount: 0, goneCount: 0 })
  assert.deepEqual(sender.getSent(), [])
})

test('sendTodoDigests sends shared tasks to every subscribed participant on all their devices', async () => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await subscribeOwner(database)
  await savePushDevice(toAuthSession(OWNER_ID), createDevice(LAPTOP_ENDPOINT), db, MOSCOW_NINE_AM)
  await savePushDevice(toAuthSession(FRIEND_ID), createDevice('https://fcm.googleapis.com/fcm/send/friend', { timeZone: 'Asia/Yerevan' }), db, MOSCOW_NINE_AM)
  await addTodo(database, 'shared', `${MOSCOW_TODAY}T00:00`)
  await addTodo(database, 'private', `${MOSCOW_TODAY}T00:00`)
  await db.insert(todoShare).values({ id: 'share', todoId: 'shared', sharedWithId: FRIEND_ID, createdAt: new Date() })
  const sender = createFakeSender()

  const result = await sendTodoDigests(db, new Date('2026-10-09T05:00:00Z'), sender.send)

  assert.deepEqual(result, { userCount: 1, deliveredCount: 1, goneCount: 0 })
  assert.deepEqual(sender.getSent().map(({ endpoint, message }) => [endpoint, message.body]), [
    ['https://fcm.googleapis.com/fcm/send/friend', 'Task shared'],
  ])

  await sendTodoDigests(db, MOSCOW_NINE_AM, sender.send)

  assert.deepEqual(sender.getSent().slice(1).map(({ endpoint }) => endpoint).sort(), [LAPTOP_ENDPOINT, PHONE_ENDPOINT])
})

test('sendTodoDigests forgets gone devices and keeps going past a broken time zone', async () => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await subscribeOwner(database)
  await savePushDevice(toAuthSession(OWNER_ID), createDevice(LAPTOP_ENDPOINT), db, MOSCOW_NINE_AM)
  await savePushDevice(toAuthSession(FRIEND_ID), createDevice('https://fcm.googleapis.com/fcm/send/friend'), db, MOSCOW_NINE_AM)
  database.sqlite.prepare('UPDATE todo_digest_settings SET time_zone = ? WHERE user_id = ?').run('Mars/Olympus_Mons', FRIEND_ID)
  await addTodo(database, 'today', `${MOSCOW_TODAY}T00:00`)
  const sender = createFakeSender(target => target.endpoint === LAPTOP_ENDPOINT
    ? { status: 410, isDelivered: false, isGone: true }
    : { status: 201, isDelivered: true, isGone: false })

  const result = await sendTodoDigests(db, MOSCOW_NINE_AM, sender.send)

  assert.deepEqual(result, { userCount: 1, deliveredCount: 1, goneCount: 1 })
  assert.deepEqual(readEndpoints(database), ['https://fcm.googleapis.com/fcm/send/friend', PHONE_ENDPOINT])
})

test('sendTodoDigests sends a silent reminder about an overdue task with actions and normal urgency', async () => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await subscribeOwner(database)
  await addTodo(database, 'overdue', '2026-10-08T00:00')
  const sender = createFakeSender()

  await sendTodoDigests(db, MOSCOW_NINE_AM, sender.send)

  const [sent] = sender.getSent()
  assert.equal(sent?.message.isSilent, true)
  assert.deepEqual(sent?.message.todo, { id: 'overdue', plannedDate: '2026-10-08' })
  assert.deepEqual(sent?.options, { ttlSeconds: 12 * 60 * 60, urgency: 'normal', topic: 'todo-digest' })
})
