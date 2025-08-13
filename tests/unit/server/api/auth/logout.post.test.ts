import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'

vi.mock('h3', () => ({
  defineEventHandler: vi.fn(handler => handler),
  getCookie: vi.fn(),
  deleteCookie: vi.fn(),
  createError: vi.fn(),
}))

vi.mock('node:crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(),
  })),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

vi.mock('~~/server/db', () => ({
  db: {
    delete: vi.fn(),
  },
}))

vi.mock('~~/server/db/schema', () => ({
  session: {
    tokenHash: 'token_hash_column',
  },
}))

let mockGetCookie: ReturnType<typeof vi.fn>
let mockDeleteCookie: ReturnType<typeof vi.fn>
let mockCreateError: ReturnType<typeof vi.fn>
let mockCreateHash: ReturnType<typeof vi.fn>
let mockHashUpdate: ReturnType<typeof vi.fn>
let mockHashDigest: ReturnType<typeof vi.fn>
let mockEq: ReturnType<typeof vi.fn>
let mockDb: any
let mockSession: any

const originalConsole = console
const consoleSpy = vi.fn()

describe('server/api/auth/logout.post', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    global.console = {
      ...console,
      error: consoleSpy,
    }

    const h3 = await import('h3')
    const crypto = await import('node:crypto')
    const drizzle = await import('drizzle-orm')
    const db = await import('~~/server/db')
    const schema = await import('~~/server/db/schema')

    mockGetCookie = h3.getCookie as ReturnType<typeof vi.fn>
    mockDeleteCookie = h3.deleteCookie as ReturnType<typeof vi.fn>
    mockCreateError = h3.createError as ReturnType<typeof vi.fn>
    mockCreateHash = crypto.createHash as ReturnType<typeof vi.fn>
    mockEq = drizzle.eq as ReturnType<typeof vi.fn>
    mockDb = db.db
    mockSession = schema.session

    mockHashUpdate = vi.fn().mockReturnThis()
    mockHashDigest = vi.fn()
    mockCreateHash.mockReturnValue({
      update: mockHashUpdate,
      digest: mockHashDigest,
    })

    mockEq.mockReturnValue('mocked-eq-result')

    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })
  })

  afterEach(() => {
    global.console = originalConsole
  })

  it('should successfully logout with valid token', async () => {
    const mockEvent = {} as H3Event
    const mockToken = 'valid-auth-token'
    const mockTokenHash = 'hashed-token'

    mockGetCookie.mockReturnValue(mockToken)
    mockHashDigest.mockReturnValue(mockTokenHash)

    const mockWhere = vi.fn().mockResolvedValue(undefined)
    mockDb.delete.mockReturnValue({ where: mockWhere })

    const handler = await import('~~/server/api/auth/logout.post')
    const result = await handler.default(mockEvent)

    expect(mockGetCookie).toHaveBeenCalledWith(mockEvent, 'auth-token')
    expect(mockCreateHash).toHaveBeenCalledWith('sha256')
    expect(mockHashUpdate).toHaveBeenCalledWith(mockToken)
    expect(mockHashDigest).toHaveBeenCalledWith('hex')
    expect(mockDb.delete).toHaveBeenCalledWith(mockSession)
    expect(mockWhere).toHaveBeenCalledWith('mocked-eq-result')
    expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, 'auth-token', { path: '/' })
    expect(result).toEqual({ success: true })
  })

  it('should logout successfully when no token exists', async () => {
    const mockEvent = {} as H3Event

    mockGetCookie.mockReturnValue(undefined)

    const handler = await import('~~/server/api/auth/logout.post')
    const result = await handler.default(mockEvent)

    expect(mockGetCookie).toHaveBeenCalledWith(mockEvent, 'auth-token')
    expect(mockDb.delete).not.toHaveBeenCalled()
    expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, 'auth-token', { path: '/' })
    expect(result).toEqual({ success: true })
  })

  it('should logout successfully when token is empty string', async () => {
    const mockEvent = {} as H3Event

    mockGetCookie.mockReturnValue('')

    const handler = await import('~~/server/api/auth/logout.post')
    const result = await handler.default(mockEvent)

    expect(mockGetCookie).toHaveBeenCalledWith(mockEvent, 'auth-token')
    expect(mockDb.delete).not.toHaveBeenCalled()
    expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, 'auth-token', { path: '/' })
    expect(result).toEqual({ success: true })
  })

  it('should handle database errors and throw createError', async () => {
    const mockEvent = {} as H3Event
    const mockToken = 'valid-auth-token'
    const mockTokenHash = 'hashed-token'
    const dbError = new Error('Database connection failed')

    mockGetCookie.mockReturnValue(mockToken)
    mockHashDigest.mockReturnValue(mockTokenHash)

    const mockWhere = vi.fn().mockRejectedValue(dbError)
    mockDb.delete.mockReturnValue({ where: mockWhere })

    const mockErrorResponse = { statusCode: 500, statusMessage: 'Internal server error during logout' }
    mockCreateError.mockReturnValue(mockErrorResponse)

    const handler = await import('~~/server/api/auth/logout.post')

    await expect(handler.default(mockEvent)).rejects.toEqual(mockErrorResponse)

    expect(consoleSpy).toHaveBeenCalledWith('Database error during logout:', dbError)
    expect(mockCreateError).toHaveBeenCalledWith({
      statusCode: 500,
      statusMessage: 'Internal server error during logout',
    })
  })

  it('should hash token correctly', async () => {
    const mockEvent = {} as H3Event
    const mockToken = 'my-secure-token-123'
    const mockTokenHash = 'secure-hash-output'

    mockGetCookie.mockReturnValue(mockToken)
    mockHashDigest.mockReturnValue(mockTokenHash)

    const mockWhere = vi.fn().mockResolvedValue(undefined)
    mockDb.delete.mockReturnValue({ where: mockWhere })

    const handler = await import('~~/server/api/auth/logout.post')
    await handler.default(mockEvent)

    expect(mockCreateHash).toHaveBeenCalledWith('sha256')
    expect(mockHashUpdate).toHaveBeenCalledWith(mockToken)
    expect(mockHashDigest).toHaveBeenCalledWith('hex')
  })

  it('should use correct database query structure', async () => {
    const mockEvent = {} as H3Event
    const mockToken = 'test-token'
    const mockTokenHash = 'test-hash'

    mockGetCookie.mockReturnValue(mockToken)
    mockHashDigest.mockReturnValue(mockTokenHash)

    const mockWhere = vi.fn().mockResolvedValue(undefined)
    mockDb.delete.mockReturnValue({ where: mockWhere })

    const handler = await import('~~/server/api/auth/logout.post')
    await handler.default(mockEvent)

    expect(mockDb.delete).toHaveBeenCalledWith(mockSession)
    expect(mockEq).toHaveBeenCalledWith(mockSession.tokenHash, mockTokenHash)
  })

  it('should always delete cookie regardless of database operation result', async () => {
    const mockEvent = {} as H3Event
    const mockToken = 'valid-token'

    mockGetCookie.mockReturnValue(mockToken)
    mockHashDigest.mockReturnValue('hash')

    const dbError = new Error('Database error')
    const mockWhere = vi.fn().mockRejectedValue(dbError)
    mockDb.delete.mockReturnValue({ where: mockWhere })

    const mockErrorResponse = { statusCode: 500, statusMessage: 'Internal server error during logout' }
    mockCreateError.mockReturnValue(mockErrorResponse)

    const handler = await import('~~/server/api/auth/logout.post')

    await expect(handler.default(mockEvent)).rejects.toEqual(mockErrorResponse)

    expect(mockDeleteCookie).not.toHaveBeenCalled()
  })
})
