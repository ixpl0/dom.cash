import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

vi.mock('h3', () => ({
  defineEventHandler: vi.fn(handler => handler),
  readBody: vi.fn(),
  createError: vi.fn(error => new Error(error.statusMessage)),
}))

const mockDefineEventHandler = vi.fn(handler => handler)
global.defineEventHandler = mockDefineEventHandler

vi.mock('~~/server/utils/session', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('~~/server/services/users', () => ({
  updateUserCurrency: vi.fn(),
}))

vi.mock('~~/server/services/sharing', () => ({
  findUserByUsername: vi.fn(),
  getExistingShare: vi.fn(),
}))

let mockRequireAuth: ReturnType<typeof vi.fn>
let mockReadBody: ReturnType<typeof vi.fn>
let mockUpdateUserCurrency: ReturnType<typeof vi.fn>
let mockFindUserByUsername: ReturnType<typeof vi.fn>
let mockGetExistingShare: ReturnType<typeof vi.fn>

describe('server/api/user/currency.put', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const h3 = await import('h3')
    const session = await import('~~/server/utils/session')
    const users = await import('~~/server/services/users')
    const sharing = await import('~~/server/services/sharing')

    mockRequireAuth = session.requireAuth as ReturnType<typeof vi.fn>
    mockReadBody = h3.readBody as ReturnType<typeof vi.fn>
    mockUpdateUserCurrency = users.updateUserCurrency as ReturnType<typeof vi.fn>
    mockFindUserByUsername = sharing.findUserByUsername as ReturnType<typeof vi.fn>
    mockGetExistingShare = sharing.getExistingShare as ReturnType<typeof vi.fn>
  })

  it('should update current user currency successfully', async () => {
    const mockEvent = {} as H3Event
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      mainCurrency: 'USD',
    }

    mockRequireAuth.mockResolvedValue(mockUser)
    mockReadBody.mockResolvedValue({ currency: 'EUR' })
    mockUpdateUserCurrency.mockResolvedValue(undefined)

    const handler = await import('~~/server/api/user/currency.put')
    const result = await handler.default(mockEvent)

    expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent)
    expect(mockReadBody).toHaveBeenCalledWith(mockEvent)
    expect(mockUpdateUserCurrency).toHaveBeenCalledWith('user-123', 'EUR')
    expect(result).toEqual({ success: true })
  })

  it('should update target user currency with write permission', async () => {
    const mockEvent = {} as H3Event
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      mainCurrency: 'USD',
    }
    const mockTargetUser = {
      id: 'user-456',
      username: 'targetuser',
      mainCurrency: 'EUR',
    }
    const mockShare = { access: 'write' }

    mockRequireAuth.mockResolvedValue(mockUser)
    mockReadBody.mockResolvedValue({ currency: 'GBP', targetUsername: 'targetuser' })
    mockFindUserByUsername.mockResolvedValue(mockTargetUser)
    mockGetExistingShare.mockResolvedValue(mockShare)
    mockUpdateUserCurrency.mockResolvedValue(undefined)

    const handler = await import('~~/server/api/user/currency.put')
    const result = await handler.default(mockEvent)

    expect(mockFindUserByUsername).toHaveBeenCalledWith('targetuser')
    expect(mockGetExistingShare).toHaveBeenCalledWith('user-456', 'user-123')
    expect(mockUpdateUserCurrency).toHaveBeenCalledWith('user-456', 'GBP')
    expect(result).toEqual({ success: true })
  })

  it('should reject invalid currency format', async () => {
    const mockEvent = {} as H3Event
    const mockUser = { id: 'user-123' }

    mockRequireAuth.mockResolvedValue(mockUser)
    mockReadBody.mockResolvedValue({ currency: 'invalid' })

    const handler = await import('~~/server/api/user/currency.put')

    await expect(handler.default(mockEvent)).rejects.toThrow('Invalid currency format')
  })

  it('should reject currency with wrong length', async () => {
    const mockEvent = {} as H3Event
    const mockUser = { id: 'user-123' }

    mockRequireAuth.mockResolvedValue(mockUser)
    mockReadBody.mockResolvedValue({ currency: 'USDD' })

    const handler = await import('~~/server/api/user/currency.put')

    await expect(handler.default(mockEvent)).rejects.toThrow('Invalid currency format')
  })

  it('should reject lowercase currency', async () => {
    const mockEvent = {} as H3Event
    const mockUser = { id: 'user-123' }

    mockRequireAuth.mockResolvedValue(mockUser)
    mockReadBody.mockResolvedValue({ currency: 'usd' })

    const handler = await import('~~/server/api/user/currency.put')

    await expect(handler.default(mockEvent)).rejects.toThrow('Invalid currency format')
  })

  it('should reject when target user not found', async () => {
    const mockEvent = {} as H3Event
    const mockUser = { id: 'user-123' }

    mockRequireAuth.mockResolvedValue(mockUser)
    mockReadBody.mockResolvedValue({ currency: 'EUR', targetUsername: 'nonexistent' })
    mockFindUserByUsername.mockResolvedValue(null)

    const handler = await import('~~/server/api/user/currency.put')

    await expect(handler.default(mockEvent)).rejects.toThrow('Target user not found')
  })

  it('should reject when user has no write permission', async () => {
    const mockEvent = {} as H3Event
    const mockUser = { id: 'user-123' }
    const mockTargetUser = { id: 'user-456' }

    mockRequireAuth.mockResolvedValue(mockUser)
    mockReadBody.mockResolvedValue({ currency: 'EUR', targetUsername: 'targetuser' })
    mockFindUserByUsername.mockResolvedValue(mockTargetUser)
    mockGetExistingShare.mockResolvedValue(null)

    const handler = await import('~~/server/api/user/currency.put')

    await expect(handler.default(mockEvent)).rejects.toThrow('No permission to update this user currency')
  })

  it('should reject when user has read-only permission', async () => {
    const mockEvent = {} as H3Event
    const mockUser = { id: 'user-123' }
    const mockTargetUser = { id: 'user-456' }
    const mockShare = { access: 'read' }

    mockRequireAuth.mockResolvedValue(mockUser)
    mockReadBody.mockResolvedValue({ currency: 'EUR', targetUsername: 'targetuser' })
    mockFindUserByUsername.mockResolvedValue(mockTargetUser)
    mockGetExistingShare.mockResolvedValue(mockShare)

    const handler = await import('~~/server/api/user/currency.put')

    await expect(handler.default(mockEvent)).rejects.toThrow('No permission to update this user currency')
  })

  it('should allow owner to update their own currency via targetUsername', async () => {
    const mockEvent = {} as H3Event
    const mockUser = { id: 'user-123', username: 'testuser' }
    const mockTargetUser = { id: 'user-123', username: 'testuser' }

    mockRequireAuth.mockResolvedValue(mockUser)
    mockReadBody.mockResolvedValue({ currency: 'EUR', targetUsername: 'testuser' })
    mockFindUserByUsername.mockResolvedValue(mockTargetUser)
    mockUpdateUserCurrency.mockResolvedValue(undefined)

    const handler = await import('~~/server/api/user/currency.put')
    const result = await handler.default(mockEvent)

    expect(mockUpdateUserCurrency).toHaveBeenCalledWith('user-123', 'EUR')
    expect(result).toEqual({ success: true })
    expect(mockGetExistingShare).not.toHaveBeenCalled()
  })

  it('should handle database errors gracefully', async () => {
    const mockEvent = {} as H3Event
    const mockUser = { id: 'user-123' }

    mockRequireAuth.mockResolvedValue(mockUser)
    mockReadBody.mockResolvedValue({ currency: 'EUR' })
    mockUpdateUserCurrency.mockRejectedValue(new Error('Database connection failed'))

    const handler = await import('~~/server/api/user/currency.put')

    await expect(handler.default(mockEvent)).rejects.toThrow('Failed to update currency')
  })

  it('should handle authentication errors', async () => {
    const mockEvent = {} as H3Event

    mockRequireAuth.mockRejectedValue(new Error('Authentication failed'))

    const handler = await import('~~/server/api/user/currency.put')

    await expect(handler.default(mockEvent)).rejects.toThrow('Authentication failed')
  })
})
