import { describe, it, expect, vi, beforeEach } from 'vitest'

import { validateAuthToken } from '~~/shared/utils/auth'
import type { H3Event } from 'h3'

vi.mock('h3', () => ({
  getCookie: vi.fn(),
}))

vi.mock('node:crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(),
  })),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gt: vi.fn(),
}))

vi.mock('~~/server/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

vi.mock('~~/server/db/schema', () => ({
  user: {
    id: 'user_id_column',
    username: 'username_column',
    mainCurrency: 'main_currency_column',
  },
  session: {
    userId: 'user_id_column',
    tokenHash: 'token_hash_column',
    expiresAt: 'expires_at_column',
  },
}))

let mockGetCookie: ReturnType<typeof vi.fn>
let mockCreateHash: ReturnType<typeof vi.fn>
let mockHashUpdate: ReturnType<typeof vi.fn>
let mockHashDigest: ReturnType<typeof vi.fn>
let mockEq: ReturnType<typeof vi.fn>
let mockAnd: ReturnType<typeof vi.fn>
let mockGt: ReturnType<typeof vi.fn>
let mockDb: any

describe('shared/utils/auth', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const h3 = await import('h3')
    const crypto = await import('node:crypto')
    const drizzle = await import('drizzle-orm')
    const db = await import('~~/server/db')

    mockGetCookie = h3.getCookie as ReturnType<typeof vi.fn>
    mockCreateHash = crypto.createHash as ReturnType<typeof vi.fn>
    mockEq = drizzle.eq as ReturnType<typeof vi.fn>
    mockAnd = drizzle.and as ReturnType<typeof vi.fn>
    mockGt = drizzle.gt as ReturnType<typeof vi.fn>
    mockDb = db.db

    mockHashUpdate = vi.fn().mockReturnThis()
    mockHashDigest = vi.fn()
    mockCreateHash.mockReturnValue({
      update: mockHashUpdate,
      digest: mockHashDigest,
    })

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })
  })

  describe('validateAuthToken', () => {
    it('should return error when no token provided', async () => {
      const mockEvent = {} as H3Event
      mockGetCookie.mockReturnValue(undefined)

      const result = await validateAuthToken(mockEvent)

      expect(result).toEqual({
        user: null,
        error: 'No token provided',
      })
      expect(mockGetCookie).toHaveBeenCalledWith(mockEvent, 'auth-token')
    })

    it('should return error when token is empty string', async () => {
      const mockEvent = {} as H3Event
      mockGetCookie.mockReturnValue('')

      const result = await validateAuthToken(mockEvent)

      expect(result).toEqual({
        user: null,
        error: 'No token provided',
      })
    })

    it('should return valid user when token is valid', async () => {
      const mockEvent = {} as H3Event
      const mockToken = 'valid-auth-token'
      const mockTokenHash = 'hashed-token'
      const mockUserRecord = {
        id: 'user-123',
        username: 'testuser',
        mainCurrency: 'USD',
      }

      mockGetCookie.mockReturnValue(mockToken)
      mockHashDigest.mockReturnValue(mockTokenHash)

      const mockLimit = vi.fn().mockResolvedValue([mockUserRecord])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
      mockDb.select.mockReturnValue({ from: mockFrom })

      const result = await validateAuthToken(mockEvent)

      expect(result).toEqual({
        user: mockUserRecord,
      })
      expect(mockCreateHash).toHaveBeenCalledWith('sha256')
      expect(mockHashUpdate).toHaveBeenCalledWith(mockToken)
      expect(mockHashDigest).toHaveBeenCalledWith('hex')
    })

    it('should return error when user not found', async () => {
      const mockEvent = {} as H3Event
      const mockToken = 'invalid-token'

      mockGetCookie.mockReturnValue(mockToken)
      mockHashDigest.mockReturnValue('invalid-hash')

      const mockLimit = vi.fn().mockResolvedValue([])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
      mockDb.select.mockReturnValue({ from: mockFrom })

      const result = await validateAuthToken(mockEvent)

      expect(result).toEqual({
        user: null,
        error: 'Invalid or expired token',
      })
    })

    it('should handle database errors gracefully', async () => {
      const mockEvent = {} as H3Event
      const mockToken = 'some-token'
      const dbError = new Error('Database connection failed')

      mockGetCookie.mockReturnValue(mockToken)
      mockHashDigest.mockReturnValue('some-hash')

      const mockLimit = vi.fn().mockRejectedValue(dbError)
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
      mockDb.select.mockReturnValue({ from: mockFrom })

      const result = await validateAuthToken(mockEvent)

      expect(result).toEqual({
        user: null,
        error: 'Database connection failed',
      })
    })

    it('should handle unknown errors', async () => {
      const mockEvent = {} as H3Event
      const mockToken = 'some-token'

      mockGetCookie.mockReturnValue(mockToken)
      mockHashDigest.mockReturnValue('some-hash')

      const mockLimit = vi.fn().mockRejectedValue('Unknown error')
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
      mockDb.select.mockReturnValue({ from: mockFrom })

      const result = await validateAuthToken(mockEvent)

      expect(result).toEqual({
        user: null,
        error: 'Unknown authentication error',
      })
    })

    it('should use correct database query structure', async () => {
      const mockEvent = {} as H3Event
      const mockToken = 'test-token'
      const mockTokenHash = 'test-hash'

      mockGetCookie.mockReturnValue(mockToken)
      mockHashDigest.mockReturnValue(mockTokenHash)

      const mockLimit = vi.fn().mockResolvedValue([])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
      mockDb.select.mockReturnValue({ from: mockFrom })

      await validateAuthToken(mockEvent)

      expect(mockDb.select).toHaveBeenCalledWith({
        id: 'user_id_column',
        username: 'username_column',
        mainCurrency: 'main_currency_column',
      })
    })

    it('should hash token correctly', async () => {
      const mockEvent = {} as H3Event
      const mockToken = 'my-auth-token-123'

      mockGetCookie.mockReturnValue(mockToken)
      mockHashDigest.mockReturnValue('mock-hash')

      const mockLimit = vi.fn().mockResolvedValue([])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
      mockDb.select.mockReturnValue({ from: mockFrom })

      await validateAuthToken(mockEvent)

      expect(mockCreateHash).toHaveBeenCalledWith('sha256')
      expect(mockHashUpdate).toHaveBeenCalledWith(mockToken)
      expect(mockHashDigest).toHaveBeenCalledWith('hex')
    })
  })
})
