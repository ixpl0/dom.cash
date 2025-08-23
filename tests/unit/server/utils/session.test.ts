import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

import { requireAuth, getOptionalAuth } from '~~/server/utils/session'

vi.mock('h3', () => ({
  createError: vi.fn(),
}))

vi.mock('~~/server/utils/auth-validation', () => ({
  validateAuthToken: vi.fn(),
}))

let mockCreateError: any
let mockValidateAuthToken: any

describe('server/utils/session', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const h3 = await import('h3')
    const auth = await import('~~/server/utils/auth-validation')

    mockCreateError = h3.createError as ReturnType<typeof vi.fn>
    mockValidateAuthToken = auth.validateAuthToken as ReturnType<typeof vi.fn>
  })

  describe('requireAuth', () => {
    it('should return user when authentication is valid', async () => {
      const mockEvent = {} as H3Event
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        mainCurrency: 'USD',
      }

      mockValidateAuthToken.mockResolvedValue({
        user: mockUser,
        error: null,
      })

      const result = await requireAuth(mockEvent)

      expect(mockValidateAuthToken).toHaveBeenCalledWith(mockEvent)
      expect(result).toEqual(mockUser)
      expect(mockCreateError).not.toHaveBeenCalled()
    })

    it('should throw error when user is null', async () => {
      const mockEvent = {} as H3Event
      const authError = 'Invalid token'

      mockValidateAuthToken.mockResolvedValue({
        user: null,
        error: authError,
      })

      const error = new Error('Authentication required')
      mockCreateError.mockReturnValue(error)

      await expect(requireAuth(mockEvent)).rejects.toThrow('Authentication required')

      expect(mockValidateAuthToken).toHaveBeenCalledWith(mockEvent)
      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 401,
        message: authError,
      })
    })

    it('should throw error with default message when no error provided', async () => {
      const mockEvent = {} as H3Event

      mockValidateAuthToken.mockResolvedValue({
        user: null,
      })

      const error = new Error('Authentication required')
      mockCreateError.mockReturnValue(error)

      await expect(requireAuth(mockEvent)).rejects.toThrow('Authentication required')

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 401,
        message: 'Authentication required',
      })
    })

    it('should handle validateAuthToken errors', async () => {
      const mockEvent = {} as H3Event
      const validationError = new Error('Token validation failed')

      mockValidateAuthToken.mockRejectedValue(validationError)

      await expect(requireAuth(mockEvent)).rejects.toThrow('Token validation failed')

      expect(mockValidateAuthToken).toHaveBeenCalledWith(mockEvent)
      expect(mockCreateError).not.toHaveBeenCalled()
    })

    it('should throw error when user exists but is undefined', async () => {
      const mockEvent = {} as H3Event

      mockValidateAuthToken.mockResolvedValue({
        user: undefined,
        error: 'Token expired',
      })

      const error = new Error('Authentication required')
      mockCreateError.mockReturnValue(error)

      await expect(requireAuth(mockEvent)).rejects.toThrow('Authentication required')

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 401,
        message: 'Token expired',
      })
    })
  })

  describe('getOptionalAuth', () => {
    it('should return user when authentication is valid', async () => {
      const mockEvent = {} as H3Event
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        mainCurrency: 'EUR',
      }

      mockValidateAuthToken.mockResolvedValue({
        user: mockUser,
        error: null,
      })

      const result = await getOptionalAuth(mockEvent)

      expect(mockValidateAuthToken).toHaveBeenCalledWith(mockEvent)
      expect(result).toEqual(mockUser)
      expect(mockCreateError).not.toHaveBeenCalled()
    })

    it('should return null when user is not authenticated', async () => {
      const mockEvent = {} as H3Event

      mockValidateAuthToken.mockResolvedValue({
        user: null,
        error: 'No token provided',
      })

      const result = await getOptionalAuth(mockEvent)

      expect(mockValidateAuthToken).toHaveBeenCalledWith(mockEvent)
      expect(result).toBeNull()
      expect(mockCreateError).not.toHaveBeenCalled()
    })

    it('should return undefined when user is undefined', async () => {
      const mockEvent = {} as H3Event

      mockValidateAuthToken.mockResolvedValue({
        user: undefined,
      })

      const result = await getOptionalAuth(mockEvent)

      expect(result).toBeUndefined()
    })

    it('should handle validateAuthToken errors gracefully', async () => {
      const mockEvent = {} as H3Event
      const validationError = new Error('Database connection failed')

      mockValidateAuthToken.mockRejectedValue(validationError)

      await expect(getOptionalAuth(mockEvent)).rejects.toThrow('Database connection failed')

      expect(mockValidateAuthToken).toHaveBeenCalledWith(mockEvent)
      expect(mockCreateError).not.toHaveBeenCalled()
    })

    it('should extract user from validation result correctly', async () => {
      const mockEvent = {} as H3Event
      const mockUser = {
        id: 'another-user-id',
        username: 'anotheruser',
        mainCurrency: 'GBP',
      }

      mockValidateAuthToken.mockResolvedValue({
        user: mockUser,
        error: null,
        someOtherProperty: 'ignored',
      })

      const result = await getOptionalAuth(mockEvent)

      expect(result).toEqual(mockUser)
    })

    it('should handle empty validation result', async () => {
      const mockEvent = {} as H3Event

      mockValidateAuthToken.mockResolvedValue({})

      const result = await getOptionalAuth(mockEvent)

      expect(result).toBeUndefined()
    })
  })
})
