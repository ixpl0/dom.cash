import { describe, it, expect, vi } from 'vitest'

const mockDrizzle = vi.fn()

vi.mock('drizzle-orm/d1', () => ({
  drizzle: mockDrizzle,
}))

vi.mock('~~/server/db/schema', () => ({
  user: {},
  session: {},
  month: {},
  entry: {},
  currency: {},
  budgetShare: {},
}))

describe('server/db/index', () => {
  it('should export useDatabase function', async () => {
    const dbModule = await import('~~/server/db/index')
    expect(dbModule.useDatabase).toBeDefined()
    expect(typeof dbModule.useDatabase).toBe('function')
  })

  it('should handle D1 database context', async () => {
    const mockD1 = { select: vi.fn() }
    const mockDb = { select: vi.fn() }
    const mockEvent = {
      context: {
        cloudflare: {
          env: {
            DB: mockD1,
          },
        },
      },
    }

    mockDrizzle.mockReturnValue(mockDb)

    const { useDatabase } = await import('~~/server/db/index')
    const result = useDatabase(mockEvent as any)

    expect(mockDrizzle).toHaveBeenCalledWith(mockD1, expect.any(Object))
    expect(result).toBe(mockDb)
  })

  it('should throw error when D1 database not found', async () => {
    const mockEvent = {
      context: {},
    }

    const { useDatabase } = await import('~~/server/db/index')

    expect(() => useDatabase(mockEvent as any)).toThrow('D1 database not found. Make sure to run with wrangler dev.')
  })
})
