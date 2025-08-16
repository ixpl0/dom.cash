import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('~~/server/db', () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  },
}))

vi.mock('~~/server/db/schema', () => ({
  user: {
    username: 'user.username',
  },
  budgetShare: {
    ownerId: 'budgetShare.ownerId',
    access: 'budgetShare.access',
    sharedWithId: 'budgetShare.sharedWithId',
  },
  month: {
    userId: 'month.userId',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

let mockDb: any

const {
  findUserByUsername,
  checkReadPermission,
} = await import('~~/server/services/users')

describe('server/services/users', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const db = await import('~~/server/db')
    mockDb = db.db
  })

  afterEach(() => {
    vi.clearAllMocks()
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

  describe('checkReadPermission', () => {
    it('should return true for same user', async () => {
      const result = await checkReadPermission('user-1', 'user-1')

      expect(result).toBe(true)
    })

    it('should return true if user has any share', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([{ access: 'read' }])

      const result = await checkReadPermission('user-1', 'user-2')

      expect(result).toBe(true)
    })

    it('should return false if user has no share', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      const result = await checkReadPermission('user-1', 'user-2')

      expect(result).toBe(false)
    })
  })
})
