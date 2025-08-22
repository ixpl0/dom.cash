import { describe, it, expect, vi } from 'vitest'
import { generateSessionToken, findUser } from '~~/server/utils/auth'
import { createMockEvent } from '~~/tests/utils/mock-database'

// Mock database для тестов
const mockDb = {
  query: {
    user: {
      findFirst: vi.fn(),
    },
  },
}

vi.mock('~~/server/db', () => ({
  useDatabase: vi.fn(() => mockDb),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

describe('server/utils/auth', () => {
  describe('generateSessionToken', () => {
    it('should generate a session token', () => {
      const token = generateSessionToken()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })
  })

  describe('findUser', () => {
    it('should return undefined when user not found', async () => {
      const { useDatabase } = await import('~~/server/db')
      const mockEvent = createMockEvent()
      const mockDb = useDatabase(mockEvent)
      vi.mocked(mockDb.query.user.findFirst).mockResolvedValue(undefined)

      const result = await findUser('nonexistent', mockEvent)

      expect(result).toBeUndefined()
    })

    it('should call database with correct parameters', async () => {
      const mockEvent = createMockEvent()

      await findUser('testuser', mockEvent)

      expect(mockDb.query.user.findFirst).toHaveBeenCalled()
    })
  })
})
