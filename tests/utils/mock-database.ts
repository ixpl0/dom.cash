import { vi } from 'vitest'
import type { H3Event } from 'h3'

export const createMockEvent = (): H3Event => ({
  context: {
    cloudflare: {
      env: {
        DB: createMockDatabase(),
      },
    },
  },
} as unknown as H3Event)

export const createMockDatabase = () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
  }

  mockDb.limit.mockResolvedValue([])
  mockDb.returning.mockResolvedValue([])

  return mockDb
}

export const mockUseDatabase = vi.fn()

export const db = createMockDatabase()
