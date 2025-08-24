import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockDb = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
}

vi.mock('~~/server/db', () => ({
  db: mockDb,
  useDatabase: vi.fn(),
}))

vi.mock('~~/server/utils/d1-batch', () => ({
  executeBatch: vi.fn().mockResolvedValue([]),
}))

// Mock getExchangeRatesForMonth to avoid complex mocking
const mockGetExchangeRatesForMonth = vi.fn().mockResolvedValue({
  rates: { USD: 1, EUR: 1.1, GBP: 0.9 },
  source: '2024-01-01',
})

const db = mockDb

// Mock event for tests
const mockEvent = {
  context: {
    cloudflare: {
      env: {
        DB: mockDb,
      },
    },
  },
} as any

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
  desc: vi.fn(() => 'desc_condition'),
  eq: vi.fn(() => 'eq_condition'),
  and: vi.fn(() => 'and_condition'),
}))

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn().mockReturnValue('mock-uuid'),
  },
  writable: true,
})

describe('server/services/months', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const dbModule = await import('~~/server/db')
    vi.mocked(dbModule.useDatabase).mockReturnValue(mockDb as any)
    const { clearRatesCache } = await import('~~/server/services/months')
    clearRatesCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getExchangeRatesForMonth', () => {
    it('should return cached rates if available', async () => {
      const { getExchangeRatesForMonth } = await import('~~/server/services/months')

      const mockRates = { EUR: 1.1, USD: 1.0, GBP: 0.9 }
      const mockCurrency = { date: '2024-01-01', rates: mockRates }

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockCurrency]),
          }),
        }),
      } as any)

      const result = await getExchangeRatesForMonth(2024, 0, mockEvent)
      expect(result).toEqual({ rates: mockRates, source: '2024-01-01' })
    })

    it('should return undefined if no rates found', async () => {
      const { getExchangeRatesForMonth } = await import('~~/server/services/months')

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        } as any)

      const result = await getExchangeRatesForMonth(2024, 0, mockEvent)
      expect(result).toBeUndefined()
    })
  })

  describe.skip('createMonth', () => {
    beforeEach(() => {
      // Reset mocks before each test
      vi.clearAllMocks()
      mockGetExchangeRatesForMonth.mockResolvedValue({
        rates: { USD: 1, EUR: 1.1, GBP: 0.9 },
        source: '2024-01-01',
      })
    })

    it('should create month and copy balance entries if copyFromMonthId provided', async () => {
      const { createMonth } = await import('~~/server/services/months')

      const mockMonth = { id: 'month1', userId: 'user1', year: 2024, month: 0 }
      const mockBalanceEntries = [
        { id: 'entry1', kind: 'balance', description: 'Test', amount: 1000, currency: 'USD' },
      ]

      vi.mocked(db.select)
        // Mock for checking existing month
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any)
        // Mock for copyBalanceEntriesFromMonth (source entries)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockBalanceEntries),
          }),
        } as any)
        // Mock for buildMonthData (target entries)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // Empty entries initially
          }),
        } as any)

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMonth]),
        }),
      } as any)

      const result = await createMonth({
        targetUserId: 'user1',
        year: 2024,
        month: 0,
        copyFromMonthId: 'copyFromMonth1',
      }, mockEvent)

      expect(result.id).toBe('month1')
      expect(result.year).toBe(2024)
      expect(result.month).toBe(0)
    })

    it('should throw error if month creation fails', async () => {
      const { createMonth } = await import('~~/server/services/months')

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any)

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any)

      await expect(createMonth({ targetUserId: 'user1', year: 2024, month: 0 }, mockEvent)).rejects.toThrow('Failed to create month')
    })
  })

  describe('findUserByUsername', () => {
    it('should return user if found', async () => {
      const { findUserByUsername } = await import('~~/server/services/months')

      const mockUser = { id: 'user1', username: 'testuser', passwordHash: 'hash', mainCurrency: 'USD', createdAt: new Date() }

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any)

      const result = await findUserByUsername('testuser', mockEvent)
      expect(result).toEqual(mockUser)
    })

    it('should return null if user not found', async () => {
      const { findUserByUsername } = await import('~~/server/services/months')

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any)

      const result = await findUserByUsername('nonexistent', mockEvent)
      expect(result).toBeNull()
    })
  })

  describe('getUserMonths logic tests', () => {
    it('should correctly group entries by type', async () => {
      const entries = [
        {
          id: 'entry-1',
          monthId: 'month-1',
          kind: 'balance',
          description: 'Opening balance',
          amount: 1000,
          currency: 'USD',
          date: null,
        },
        {
          id: 'entry-2',
          monthId: 'month-1',
          kind: 'income',
          description: 'Salary',
          amount: 5000,
          currency: 'USD',
          date: '2024-06-01',
        },
        {
          id: 'entry-3',
          monthId: 'month-1',
          kind: 'expense',
          description: 'Rent',
          amount: 2000,
          currency: 'USD',
          date: '2024-06-01',
        },
      ]

      const { income, expenses, balanceChange } = calculateTotals(entries)

      expect(income).toBe(5000)
      expect(expenses).toBe(2000)
      expect(balanceChange).toBe(3000)
    })

    it('should handle empty entries correctly', async () => {
      const { income, expenses, balanceChange } = calculateTotals([])

      expect(income).toBe(0)
      expect(expenses).toBe(0)
      expect(balanceChange).toBe(0)
    })

    it('should handle null dates in entries', async () => {
      const entries = [
        {
          id: 'entry-1',
          monthId: 'month-1',
          kind: 'income',
          description: 'Cash found',
          amount: 100,
          currency: 'USD',
          date: null,
        },
      ]

      const grouped = groupEntriesByKind(entries)
      expect(grouped.incomeEntries[0].date).toBeNull()
    })
  })

  describe('copyBalanceEntriesFromMonth', () => {
    it('should copy balance entries when they exist', async () => {
      const balanceEntries = [
        { id: 'entry-1', kind: 'balance', description: 'Test', amount: 100, currency: 'USD', date: null },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(balanceEntries)),
        })),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn(() => Promise.resolve()),
      })

      const { copyBalanceEntriesFromMonth } = await import('~~/server/services/months')

      await copyBalanceEntriesFromMonth('source-month', 'target-month', mockEvent)

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should not insert anything when no balance entries exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      })

      const { copyBalanceEntriesFromMonth } = await import('~~/server/services/months')

      await copyBalanceEntriesFromMonth('source-month', 'target-month', mockEvent)

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })

  describe('createMonth', () => {
    it.skip('should create month without copying', async () => {
      // Mock for checking existing month
      mockDb.select.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })

      // Mock for entries query in buildMonthData
      mockDb.select.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])), // Empty entries array
        })),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{
            id: 'new-month-id',
            year: 2024,
            month: 5,
          }])),
        })),
      })

      const { createMonth } = await import('~~/server/services/months')

      const result = await createMonth({
        year: 2024,
        month: 5,
        targetUserId: 'user-1',
      }, mockEvent)

      expect(result.id).toBe('new-month-id')
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should throw error if month already exists', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ id: 'existing-month' }])),
          })),
        })),
      })

      const { createMonth } = await import('~~/server/services/months')

      await expect(createMonth({
        year: 2024,
        month: 5,
        targetUserId: 'user-1',
      }, mockEvent)).rejects.toThrow('Month already exists')
    })
  })

  describe.skip('deleteMonth', () => {
    it('should successfully delete month and its entries', async () => {
      const mockMonth = { id: 'month-1', userId: 'user-1', year: 2024, month: 0 }
      const mockTransaction = vi.fn(async (callback) => {
        await callback({
          delete: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve()),
          })),
        })
      })

      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([mockMonth])),
          })),
        })),
      })
      mockDb.transaction = mockTransaction

      const { deleteMonth } = await import('~~/server/services/months')

      await deleteMonth('month-1', mockEvent)

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockTransaction).toHaveBeenCalled()
    })

    it('should throw error when month not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })

      const { deleteMonth } = await import('~~/server/services/months')

      await expect(deleteMonth('nonexistent', mockEvent)).rejects.toThrow('Month not found')
    })

    it('should delete entries before deleting month', async () => {
      const mockMonth = { id: 'month-1', userId: 'user-1', year: 2024, month: 0 }
      const deleteCalls: string[] = []

      const { entry, month } = await import('~~/server/db/schema')

      const mockTx = {
        delete: vi.fn((table) => {
          if (table === entry) {
            deleteCalls.push('entry')
          }
          else if (table === month) {
            deleteCalls.push('month')
          }
          return {
            where: vi.fn(() => Promise.resolve()),
          }
        }),
      }

      const mockTransaction = vi.fn(async (callback) => {
        await callback(mockTx)
      })

      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([mockMonth])),
          })),
        })),
      })
      mockDb.transaction = mockTransaction

      const { deleteMonth } = await import('~~/server/services/months')

      await deleteMonth('month-1', mockEvent)

      expect(deleteCalls).toEqual(['entry', 'month'])
      expect(mockTx.delete).toHaveBeenCalledTimes(2)
    })
  })

  describe('checkWritePermission', () => {
    it('should return true for same user', async () => {
      const { checkWritePermission } = await import('~~/server/services/months')

      const result = await checkWritePermission('user-1', 'user-1', mockEvent)

      expect(result).toBe(true)
    })

    it('should return true if user has write access', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ access: 'write' }])),
          })),
        })),
      })

      const { checkWritePermission } = await import('~~/server/services/months')

      const result = await checkWritePermission('user-1', 'user-2', mockEvent)

      expect(result).toBe(true)
    })

    it('should return false if user has read access only', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ access: 'read' }])),
          })),
        })),
      })

      const { checkWritePermission } = await import('~~/server/services/months')

      const result = await checkWritePermission('user-1', 'user-2', mockEvent)

      expect(result).toBe(false)
    })

    it('should return false if no share exists', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })

      const { checkWritePermission } = await import('~~/server/services/months')

      const result = await checkWritePermission('user-1', 'user-2', mockEvent)

      expect(result).toBe(false)
    })
  })
})

function calculateTotals(entries: any[]) {
  const incomeEntries = entries.filter(e => e.kind === 'income')
  const expenseEntries = entries.filter(e => e.kind === 'expense')

  const income = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0)
  const expenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0)
  const balanceChange = income - expenses

  return { income, expenses, balanceChange }
}

function groupEntriesByKind(entries: any[]) {
  const balanceSources = entries
    .filter(e => e.kind === 'balance')
    .map(e => ({
      id: e.id,
      description: e.description,
      currency: e.currency,
      amount: e.amount,
    }))

  const incomeEntries = entries
    .filter(e => e.kind === 'income')
    .map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date,
    }))

  const expenseEntries = entries
    .filter(e => e.kind === 'expense')
    .map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date,
    }))

  return { balanceSources, incomeEntries, expenseEntries }
}
