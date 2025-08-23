import { describe, it, expect, vi } from 'vitest'

describe('server/db/index', () => {
  it('should export useDatabase function', async () => {
    const dbModule = await import('~~/server/db/index')
    expect(dbModule.useDatabase).toBeDefined()
    expect(typeof dbModule.useDatabase).toBe('function')
  })

  it('should handle D1 database context', async () => {
    const mockD1 = { select: vi.fn() }
    const mockEvent = {
      context: {
        cloudflare: {
          env: {
            DB: mockD1,
          },
        },
      },
    }

    const { useDatabase } = await import('~~/server/db/index')
    const result = useDatabase(mockEvent as any)

    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })
})
