import { beforeEach, afterEach } from 'vitest'
import { user, month, entry, budgetShare, currency } from '~~/server/db/schema'
import { createMockDatabase } from '../../utils/mock-database'

// Mock database instance for tests
const db = createMockDatabase()

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
  const testUser = {
    id: crypto.randomUUID(),
    username: userData.username,
    passwordHash: userData.password,
    mainCurrency: 'USD',
    createdAt: new Date(),
  }

  db.insert(user).values(testUser).returning.mockResolvedValue([testUser])
  await db.insert(user).values(testUser).returning()

  return testUser
}

export const createTestMonth = async (userId: string, year: number, monthNumber: number) => {
  const testMonth = {
    id: crypto.randomUUID(),
    userId,
    year,
    month: monthNumber,
  }

  db.insert(month).values(testMonth).returning.mockResolvedValue([testMonth])
  await db.insert(month).values(testMonth).returning()

  return testMonth
}

export const createTestEntry = async (monthId: string, entryData: {
  kind: 'balance' | 'income' | 'expense'
  description: string
  amount: number
  currency: string
  date?: string | null
}) => {
  const testEntry = {
    id: crypto.randomUUID(),
    monthId,
    kind: entryData.kind,
    description: entryData.description,
    amount: entryData.amount,
    currency: entryData.currency,
    date: entryData.date || null,
  }

  db.insert(entry).values(testEntry).returning.mockResolvedValue([testEntry])
  await db.insert(entry).values(testEntry).returning()

  return testEntry
}

export const createTestShare = async (ownerId: string, sharedWithId: string, access: 'read' | 'write') => {
  const testShare = {
    id: crypto.randomUUID(),
    ownerId,
    sharedWithId,
    access,
    createdAt: new Date(),
  }

  db.insert(budgetShare).values(testShare).returning.mockResolvedValue([testShare])
  await db.insert(budgetShare).values(testShare).returning()

  return testShare
}
