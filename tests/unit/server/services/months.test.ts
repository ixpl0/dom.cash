import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('~~/server/db', () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
  },
}))

vi.mock('~~/server/db/schema', () => ({
  entry: {
    monthId: 'entry.monthId',
    kind: 'entry.kind',
  },
  month: {
    userId: 'month.userId',
    id: 'month.id',
    year: 'month.year',
    month: 'month.month',
  },
  currency: {
    date: 'currency.date',
  },
  budgetShare: {
    access: 'budgetShare.access',
    ownerId: 'budgetShare.ownerId',
    sharedWithId: 'budgetShare.sharedWithId',
  },
  user: {
    username: 'user.username',
  },
}))

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
}))

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn().mockReturnValue('mock-uuid'),
  },
  writable: true,
})

let mockDb: any

const {
  checkWritePermission,
  findUserByUsername,
} = await import('~~/server/services/months')

describe('server/services/months', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const db = await import('~~/server/db')
    mockDb = db.db
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('checkWritePermission', () => {
    it('should return true for same user', async () => {
      const result = await checkWritePermission('user-1', 'user-1')

      expect(result).toBe(true)
    })

    it('should return true if user has write access', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([{ access: 'write' }])

      const result = await checkWritePermission('user-1', 'user-2')

      expect(result).toBe(true)
    })

    it('should return false if user has no access', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      const result = await checkWritePermission('user-1', 'user-2')

      expect(result).toBe(false)
    })

    it('should return false if user has only read access', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([{ access: 'read' }])

      const result = await checkWritePermission('user-1', 'user-2')

      expect(result).toBe(false)
    })
  })

  describe('findUserByUsername', () => {
    it('should return user if found', async () => {
      const user = { id: 'user-1', username: 'testuser' }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([user])

      const result = await findUserByUsername('testuser')

      expect(result).toEqual(user)
    })

    it('should return null if user not found', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      const result = await findUserByUsername('nonexistent')

      expect(result).toBeNull()
    })
  })
})
