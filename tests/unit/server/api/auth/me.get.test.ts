import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

vi.mock('h3', () => ({
  defineEventHandler: vi.fn(handler => handler),
}))

vi.mock('~~/server/utils/session', () => ({
  requireAuth: vi.fn(),
}))

let mockRequireAuth: ReturnType<typeof vi.fn>

describe('server/api/auth/me.get', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const session = await import('~~/server/utils/session')
    mockRequireAuth = session.requireAuth as ReturnType<typeof vi.fn>
  })

  it('should return user data when authentication succeeds', async () => {
    const mockEvent = {} as H3Event
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      mainCurrency: 'USD',
    }

    mockRequireAuth.mockResolvedValue(mockUser)

    const handler = await import('~~/server/api/auth/me.get')
    const result = await handler.default(mockEvent)

    expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent)
    expect(result).toEqual(mockUser)
  })

  it('should throw error when authentication fails', async () => {
    const mockEvent = {} as H3Event
    const authError = new Error('Authentication required')

    mockRequireAuth.mockRejectedValue(authError)

    const handler = await import('~~/server/api/auth/me.get')

    await expect(handler.default(mockEvent)).rejects.toThrow('Authentication required')
    expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent)
  })

  it('should pass through requireAuth errors unchanged', async () => {
    const mockEvent = {} as H3Event
    const specificError = new Error('Token expired')

    mockRequireAuth.mockRejectedValue(specificError)

    const handler = await import('~~/server/api/auth/me.get')

    await expect(handler.default(mockEvent)).rejects.toBe(specificError)
  })

  it('should handle successful authentication with different user data', async () => {
    const mockEvent = {} as H3Event
    const mockUser = {
      id: 'user-456',
      username: 'john_doe',
      mainCurrency: 'EUR',
    }

    mockRequireAuth.mockResolvedValue(mockUser)

    const handler = await import('~~/server/api/auth/me.get')
    const result = await handler.default(mockEvent)

    expect(result).toEqual({
      id: 'user-456',
      username: 'john_doe',
      mainCurrency: 'EUR',
    })
  })

  it('should call requireAuth exactly once', async () => {
    const mockEvent = {} as H3Event
    const mockUser = {
      id: 'user-789',
      username: 'jane_smith',
      mainCurrency: 'GBP',
    }

    mockRequireAuth.mockResolvedValue(mockUser)

    const handler = await import('~~/server/api/auth/me.get')
    await handler.default(mockEvent)

    expect(mockRequireAuth).toHaveBeenCalledTimes(1)
    expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent)
  })
})
