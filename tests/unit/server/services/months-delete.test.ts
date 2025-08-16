import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq_condition'),
  desc: vi.fn(() => 'desc_condition'),
  and: vi.fn(() => 'and_condition'),
}))

vi.mock('~~/server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
    transaction: vi.fn(),
  },
}))

let mockDb: any

describe('server/services/months deleteMonth', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const db = await import('~~/server/db')
    mockDb = db.db
  })

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

    await deleteMonth('month-1')

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

    await expect(deleteMonth('nonexistent')).rejects.toThrow('Month not found')
  })

  it('should delete entries before deleting month', async () => {
    const mockMonth = { id: 'month-1', userId: 'user-1', year: 2024, month: 0 }
    const deleteCalls: string[] = []

    const mockTx = {
      delete: vi.fn((table) => {
        const tableName = table === 'entry' ? 'entry' : 'month'
        deleteCalls.push(tableName)
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

    await deleteMonth('month-1')

    expect(deleteCalls).toEqual(['entry', 'month'])
    expect(mockTx.delete).toHaveBeenCalledTimes(2)
  })

  it('should handle database transaction errors', async () => {
    const mockMonth = { id: 'month-1', userId: 'user-1', year: 2024, month: 0 }
    const mockTransaction = vi.fn(() => Promise.reject(new Error('Transaction failed')))

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockMonth])),
        })),
      })),
    })
    mockDb.transaction = mockTransaction

    const { deleteMonth } = await import('~~/server/services/months')

    await expect(deleteMonth('month-1')).rejects.toThrow('Transaction failed')
  })

  it('should call database with correct month ID', async () => {
    const mockMonth = { id: 'month-123', userId: 'user-1', year: 2024, month: 5 }
    let _whereCondition: string | null = null

    const mockWhere = vi.fn((condition) => {
      _whereCondition = condition
      return {
        limit: vi.fn(() => Promise.resolve([mockMonth])),
      }
    })

    mockDb.select.mockReturnValue({
      from: vi.fn(() => ({
        where: mockWhere,
      })),
    })

    mockDb.transaction = vi.fn(async (callback) => {
      await callback({
        delete: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })
    })

    const { deleteMonth } = await import('~~/server/services/months')

    await deleteMonth('month-123')

    expect(mockWhere).toHaveBeenCalledWith('eq_condition')
  })
})
