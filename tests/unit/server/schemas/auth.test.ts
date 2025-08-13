import { describe, it, expect } from 'vitest'

import { authSchema, type AuthRequest } from '~~/server/schemas/auth'

describe('server/schemas/auth', () => {
  describe('authSchema', () => {
    it('should validate correct auth data', () => {
      const validData = {
        username: 'testuser',
        password: 'password123',
      }

      const result = authSchema.parse(validData)

      expect(result).toEqual({
        username: 'testuser',
        password: 'password123',
        mainCurrency: 'USD',
      })
    })

    it('should trim username whitespace', () => {
      const dataWithSpaces = {
        username: '  testuser  ',
        password: 'password123',
      }

      const result = authSchema.parse(dataWithSpaces)

      expect(result.username).toBe('testuser')
      expect(result.mainCurrency).toBe('USD')
    })

    it('should reject username that is too short', () => {
      const invalidData = {
        username: 'ab',
        password: 'password123',
      }

      expect(() => authSchema.parse(invalidData)).toThrow()
    })

    it('should reject username that is too long', () => {
      const invalidData = {
        username: 'a'.repeat(65),
        password: 'password123',
      }

      expect(() => authSchema.parse(invalidData)).toThrow()
    })

    it('should accept username at minimum length', () => {
      const validData = {
        username: 'abc',
        password: 'password123',
      }

      const result = authSchema.parse(validData)

      expect(result.username).toBe('abc')
    })

    it('should accept username at maximum length', () => {
      const validData = {
        username: 'a'.repeat(64),
        password: 'password123',
      }

      const result = authSchema.parse(validData)

      expect(result.username).toBe('a'.repeat(64))
    })

    it('should reject password that is too short', () => {
      const invalidData = {
        username: 'testuser',
        password: '1234567',
      }

      expect(() => authSchema.parse(invalidData)).toThrow()
    })

    it('should reject password that is too long', () => {
      const invalidData = {
        username: 'testuser',
        password: 'a'.repeat(101),
      }

      expect(() => authSchema.parse(invalidData)).toThrow()
    })

    it('should accept password at minimum length', () => {
      const validData = {
        username: 'testuser',
        password: '12345678',
      }

      const result = authSchema.parse(validData)

      expect(result.password).toBe('12345678')
    })

    it('should accept password at maximum length', () => {
      const validData = {
        username: 'testuser',
        password: 'a'.repeat(100),
      }

      const result = authSchema.parse(validData)

      expect(result.password).toBe('a'.repeat(100))
    })

    it('should reject missing username', () => {
      const invalidData = {
        password: 'password123',
      } as any

      expect(() => authSchema.parse(invalidData)).toThrow()
    })

    it('should reject missing password', () => {
      const invalidData = {
        username: 'testuser',
      } as any

      expect(() => authSchema.parse(invalidData)).toThrow()
    })

    it('should reject empty username', () => {
      const invalidData = {
        username: '',
        password: 'password123',
      }

      expect(() => authSchema.parse(invalidData)).toThrow()
    })

    it('should reject empty password', () => {
      const invalidData = {
        username: 'testuser',
        password: '',
      }

      expect(() => authSchema.parse(invalidData)).toThrow()
    })

    it('should reject non-string username', () => {
      const invalidData = {
        username: 123,
        password: 'password123',
      } as any

      expect(() => authSchema.parse(invalidData)).toThrow()
    })

    it('should reject non-string password', () => {
      const invalidData = {
        username: 'testuser',
        password: 123,
      } as any

      expect(() => authSchema.parse(invalidData)).toThrow()
    })

    it('should always add mainCurrency as USD', () => {
      const validData = {
        username: 'testuser',
        password: 'password123',
      }

      const result = authSchema.parse(validData)

      expect(result.mainCurrency).toBe('USD')
    })

    it('should handle special characters in username', () => {
      const validData = {
        username: 'test_user-123',
        password: 'password123',
      }

      const result = authSchema.parse(validData)

      expect(result.username).toBe('test_user-123')
    })

    it('should handle special characters in password', () => {
      const validData = {
        username: 'testuser',
        password: 'P@ssw0rd!123',
      }

      const result = authSchema.parse(validData)

      expect(result.password).toBe('P@ssw0rd!123')
    })

    it('should preserve password case sensitivity', () => {
      const validData = {
        username: 'testuser',
        password: 'MyPassWord123',
      }

      const result = authSchema.parse(validData)

      expect(result.password).toBe('MyPassWord123')
    })
  })

  describe('AuthRequest type', () => {
    it('should correctly infer type from schema', () => {
      const authRequest: AuthRequest = {
        username: 'testuser',
        password: 'password123',
        mainCurrency: 'USD',
      }

      expect(authRequest.username).toBe('testuser')
      expect(authRequest.password).toBe('password123')
      expect(authRequest.mainCurrency).toBe('USD')
    })
  })
})
