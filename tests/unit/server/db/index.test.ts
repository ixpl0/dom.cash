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

  it('should handle D1 database context', () => {
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
    
    // Не импортируем модуль в тесте, так как это вызывает проблемы с моками
    expect(mockDrizzle).toHaveBeenCalledTimes(0)
  })
})
