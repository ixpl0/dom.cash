import { beforeEach, afterEach } from 'vitest'
// TODO: Update tests to use proper database context
// import { db } from '~~/server/db'
import { user, month, entry, budgetShare, currency } from '~~/server/db/schema'

// Temporary test database instance - needs to be replaced with proper test setup
const db: any = null

export const setupTestDatabase = () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  afterEach(async () => {
    await cleanDatabase()
  })
}

export const cleanDatabase = async () => {
  try {
    await db.delete(entry)
    await db.delete(budgetShare)
    await db.delete(month)
    await db.delete(currency)
    await db.delete(user)
  }
  catch (error) {
    console.error('Failed to clean database:', error)
  }
}

export const createTestUser = async (userData: { username: string, password: string }) => {
  const [testUser] = await db.insert(user).values({
    id: crypto.randomUUID(),
    username: userData.username,
    passwordHash: userData.password,
    mainCurrency: 'USD',
    createdAt: new Date(),
  }).returning()

  return testUser
}

export const createTestMonth = async (userId: string, year: number, monthNumber: number) => {
  const [testMonth] = await db.insert(month).values({
    id: crypto.randomUUID(),
    userId,
    year,
    month: monthNumber,
  }).returning()

  return testMonth
}

export const createTestEntry = async (monthId: string, entryData: {
  kind: 'balance' | 'income' | 'expense'
  description: string
  amount: number
  currency: string
  date?: string | null
}) => {
  const [testEntry] = await db.insert(entry).values({
    id: crypto.randomUUID(),
    monthId,
    kind: entryData.kind,
    description: entryData.description,
    amount: entryData.amount,
    currency: entryData.currency,
    date: entryData.date || null,
  }).returning()

  return testEntry
}

export const createTestShare = async (ownerId: string, sharedWithId: string, access: 'read' | 'write') => {
  const [testShare] = await db.insert(budgetShare).values({
    id: crypto.randomUUID(),
    ownerId,
    sharedWithId,
    access,
    createdAt: new Date(),
  }).returning()

  return testShare
}
