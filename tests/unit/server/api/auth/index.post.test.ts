import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

vi.mock('h3', () => ({
  defineEventHandler: vi.fn(handler => handler),
}))

vi.mock('~~/server/schemas/auth', () => ({
  authSchema: {
    parse: vi.fn(),
  },
}))

vi.mock('~~/server/utils/auth', () => ({
  ensureUser: vi.fn(),
  createSession: vi.fn(),
  setAuthCookie: vi.fn(),
}))

vi.mock('~~/server/utils/validation', () => ({
  parseBody: vi.fn(),
}))

let mockParseBody: ReturnType<typeof vi.fn>
let mockEnsureUser: ReturnType<typeof vi.fn>
let mockCreateSession: ReturnType<typeof vi.fn>
let mockSetAuthCookie: ReturnType<typeof vi.fn>

describe('server/api/auth/index.post', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const validation = await import('~~/server/utils/validation')
    const auth = await import('~~/server/utils/auth')

    mockParseBody = validation.parseBody as ReturnType<typeof vi.fn>
    mockEnsureUser = auth.ensureUser as ReturnType<typeof vi.fn>
    mockCreateSession = auth.createSession as ReturnType<typeof vi.fn>
    mockSetAuthCookie = auth.setAuthCookie as ReturnType<typeof vi.fn>
  })

  it('should successfully authenticate user and return user data', async () => {
    const mockEvent = {} as H3Event
    const mockAuthData = {
      username: 'testuser',
      password: 'password123',
      mainCurrency: 'USD',
    }
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      mainCurrency: 'USD',
    }
    const mockToken = 'auth-token-123'

    mockParseBody.mockResolvedValue(mockAuthData)
    mockEnsureUser.mockResolvedValue(mockUser)
    mockCreateSession.mockResolvedValue(mockToken)

    const handler = await import('~~/server/api/auth/index.post')
    const result = await handler.default(mockEvent)

    expect(mockParseBody).toHaveBeenCalledWith(mockEvent, expect.any(Object))
    expect(mockEnsureUser).toHaveBeenCalledWith(
      'testuser',
      'password123',
      'USD',
      expect.any(Date),
      mockEvent,
    )
    expect(mockCreateSession).toHaveBeenCalledWith('user-123', expect.any(Date), mockEvent)
    expect(mockSetAuthCookie).toHaveBeenCalledWith(mockEvent, mockToken)

    expect(result).toEqual({
      id: 'user-123',
      username: 'testuser',
      mainCurrency: 'USD',
    })
  })

  it('should handle parseBody errors', async () => {
    const mockEvent = {} as H3Event
    const parseError = new Error('Invalid body data')

    mockParseBody.mockRejectedValue(parseError)

    const handler = await import('~~/server/api/auth/index.post')

    await expect(handler.default(mockEvent)).rejects.toThrow('Invalid body data')
  })

  it('should handle ensureUser errors', async () => {
    const mockEvent = {} as H3Event
    const mockAuthData = {
      username: 'testuser',
      password: 'wrongpassword',
      mainCurrency: 'USD',
    }
    const authError = new Error('Authentication failed')

    mockParseBody.mockResolvedValue(mockAuthData)
    mockEnsureUser.mockRejectedValue(authError)

    const handler = await import('~~/server/api/auth/index.post')

    await expect(handler.default(mockEvent)).rejects.toThrow('Authentication failed')
  })

  it('should handle createSession errors', async () => {
    const mockEvent = {} as H3Event
    const mockAuthData = {
      username: 'testuser',
      password: 'password123',
      mainCurrency: 'USD',
    }
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      mainCurrency: 'USD',
    }
    const sessionError = new Error('Session creation failed')

    mockParseBody.mockResolvedValue(mockAuthData)
    mockEnsureUser.mockResolvedValue(mockUser)
    mockCreateSession.mockRejectedValue(sessionError)

    const handler = await import('~~/server/api/auth/index.post')

    await expect(handler.default(mockEvent)).rejects.toThrow('Session creation failed')
  })

  it('should use current date for ensureUser and createSession', async () => {
    const mockEvent = {} as H3Event
    const mockAuthData = {
      username: 'testuser',
      password: 'password123',
      mainCurrency: 'USD',
    }
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      mainCurrency: 'USD',
    }
    const mockToken = 'auth-token-123'

    mockParseBody.mockResolvedValue(mockAuthData)
    mockEnsureUser.mockResolvedValue(mockUser)
    mockCreateSession.mockResolvedValue(mockToken)

    const handler = await import('~~/server/api/auth/index.post')
    await handler.default(mockEvent)

    const ensureUserCall = mockEnsureUser.mock.calls[0]
    const createSessionCall = mockCreateSession.mock.calls[0]

    expect(ensureUserCall[3]).toBeInstanceOf(Date)
    expect(createSessionCall[1]).toBeInstanceOf(Date)

    const ensureUserDate = ensureUserCall[3] as Date
    const createSessionDate = createSessionCall[1] as Date
    expect(Math.abs(ensureUserDate.getTime() - createSessionDate.getTime())).toBeLessThan(10)
  })

  it('should pass correct parameters to ensureUser', async () => {
    const mockEvent = {} as H3Event
    const mockAuthData = {
      username: 'john_doe',
      password: 'secure_password',
      mainCurrency: 'EUR',
    }
    const mockUser = {
      id: 'user-456',
      username: 'john_doe',
      mainCurrency: 'EUR',
    }
    const mockToken = 'token-456'

    mockParseBody.mockResolvedValue(mockAuthData)
    mockEnsureUser.mockResolvedValue(mockUser)
    mockCreateSession.mockResolvedValue(mockToken)

    const handler = await import('~~/server/api/auth/index.post')
    await handler.default(mockEvent)

    expect(mockEnsureUser).toHaveBeenCalledWith(
      'john_doe',
      'secure_password',
      'EUR',
      expect.any(Date),
      mockEvent,
    )
  })
})
