import { vi } from 'vitest'
import type { H3Event } from 'h3'

// Mock для H3Event в тестах
export const createMockEvent = (): H3Event => ({
  context: {
    cloudflare: {
      env: {
        DB: createMockDatabase(),
      },
    },
  },
} as unknown as H3Event)

// Mock для Drizzle database
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

  // Добавляем методы которые возвращают Promise
  mockDb.limit.mockResolvedValue([])
  mockDb.returning.mockResolvedValue([])

  return mockDb
}

// Mock для useDatabase
export const mockUseDatabase = vi.fn()

// Экспортируем также db mock для обратной совместимости
export const db = createMockDatabase()
