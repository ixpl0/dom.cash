import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { useDatabase } from '../../server/db'
import { session, user } from '../../server/db/schema'
import { createSession, SESSION_LIFETIME_MS } from '../../server/utils/auth'
import { createTestDatabase, type TestDatabase } from './helpers/test-database'

const NOW = new Date('2026-09-30T12:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

const daysFromNow = (days: number): Date => new Date(NOW.getTime() + days * DAY_MS)

interface StoredSession {
  id: string
  userId: string
  expiresAt: Date
}

const createDatabaseWithSessions = async (sessions: StoredSession[]): Promise<TestDatabase> => {
  const database = createTestDatabase()
  const db = useDatabase(database.event)
  await db.insert(user).values(['owner', 'friend'].map(id => ({
    id,
    username: `${id}@example.com`,
    passwordHash: 'hash',
    mainCurrency: 'USD',
    createdAt: daysFromNow(-200),
  })))
  await db.insert(session).values(sessions.map(({ id, userId, expiresAt }) => ({
    id,
    userId,
    tokenHash: `hash-${id}`,
    createdAt: daysFromNow(-200),
    expiresAt,
  })))
  return database
}

const readSessions = (database: TestDatabase) =>
  database.sqlite.prepare('SELECT id, user_id AS userId, token_hash AS tokenHash, expires_at AS expiresAt FROM session ORDER BY expires_at').all()

test('signing in removes every expired session and keeps the live ones', async () => {
  const database = await createDatabaseWithSessions([
    { id: 'expired-own', userId: 'owner', expiresAt: daysFromNow(-1) },
    { id: 'expired-other', userId: 'friend', expiresAt: daysFromNow(-30) },
    { id: 'expires-now', userId: 'friend', expiresAt: NOW },
    { id: 'live-own', userId: 'owner', expiresAt: daysFromNow(1) },
    { id: 'live-other', userId: 'friend', expiresAt: daysFromNow(60) },
  ])

  const token = await createSession('owner', NOW, database.event)

  const stored = readSessions(database)
  assert.deepEqual(stored.map(row => row.userId), ['owner', 'friend', 'owner'])
  assert.deepEqual(stored.slice(0, 2).map(row => row.id), ['live-own', 'live-other'])
  assert.equal(stored[2]?.tokenHash, createHash('sha256').update(token).digest('hex'))
  assert.equal(stored[2]?.expiresAt, Math.floor((NOW.getTime() + SESSION_LIFETIME_MS) / 1000))
})
