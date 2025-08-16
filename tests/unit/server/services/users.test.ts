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
  entry: 'entry_table',
}))

vi.mock('~~/server/services/months', () => ({
  getUserMonths: vi.fn(),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}))

let mockDb: any

const {
  findUserByUsername,
  checkReadPermission,
  getUserBudgetData,
  updateUserCurrency,
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

  describe('getUserBudgetData', () => {
    it('should return budget data for user with permission', async () => {
      const user = { id: 'user-1', username: 'testuser' }
      const budgetData = [{
        id: 'month-1',
        year: 2024,
        month: 0,
        userMonthId: 'user-month-1',
        balanceSources: [],
        incomeEntries: [],
        expenseEntries: [],
        balanceChange: 0,
        pocketExpenses: 0,
        income: 0,
      }]

      const { getUserMonths } = await import('~~/server/services/months')
      vi.mocked(getUserMonths).mockResolvedValue(budgetData)

      let callCount = 0
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => {
              callCount++
              if (callCount === 1) {
                return Promise.resolve([user])
              }
              else {
                return Promise.resolve([{ access: 'read' }])
              }
            }),
          })),
        })),
      })

      const result = await getUserBudgetData('testuser', 'user-1')

      expect(result).toEqual(budgetData)
    })

    it('should throw error if user not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })

      await expect(getUserBudgetData('nonexistent', 'user-1')).rejects.toThrow('User not found')
    })

    it('should throw error if insufficient permissions', async () => {
      const user = { id: 'user-1', username: 'testuser' }

      let callCount = 0
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => {
              callCount++
              if (callCount === 1) {
                return Promise.resolve([user])
              }
              else {
                return Promise.resolve([])
              }
            }),
          })),
        })),
      })

      await expect(getUserBudgetData('testuser', 'user-2')).rejects.toThrow('Insufficient permissions to view budget')
    })
  })

  describe('updateUserCurrency', () => {
    it('should update user currency', async () => {
      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      }))

      mockDb.update = mockUpdate

      await updateUserCurrency('user-1', 'EUR')

      expect(mockUpdate).toHaveBeenCalled()
    })
  })
})
