import { describe, it, expect, vi } from 'vitest'
import { generateSessionToken, findUser } from '~~/server/utils/auth'

// Mock database для тестов
vi.mock('~~/server/db', () => ({
  useDatabase: vi.fn(() => ({
    query: {
      user: {
        findFirst: vi.fn(),
      },
    },
  })),
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
      const mockDb = useDatabase({} as any)
      vi.mocked(mockDb.query.user.findFirst).mockResolvedValue(undefined)

      const result = await findUser('nonexistent', {} as any)

      expect(result).toBeUndefined()
    })

    it('should call database with correct parameters', async () => {
      const { useDatabase } = await import('~~/server/db')
      const mockDb = useDatabase({} as any)

      await findUser('testuser', {} as any)

      expect(mockDb.query.user.findFirst).toHaveBeenCalled()
    })
  })
})