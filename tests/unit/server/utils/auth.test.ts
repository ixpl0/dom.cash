import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createError } from 'h3'

import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  findUser,
  createUser,
  ensureUser,
  createSession,
  setAuthCookie,
} from '~~/server/utils/auth'

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

vi.mock('node:crypto', () => ({
  randomBytes: vi.fn(),
  createHash: vi.fn(),
}))

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn().mockReturnValue('mock-uuid'),
  },
  writable: true,
})

vi.mock('h3', () => ({
  createError: vi.fn(),
  setCookie: vi.fn(),
}))

vi.mock('~~/server/db', () => ({
  db: {
    query: {
      user: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
  },
}))

vi.mock('~~/server/db/schema', () => ({
  user: {
    username: 'user.username',
    id: 'user.id',
  },
  session: {
    id: 'session.id',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

let mockBcrypt: any
let mockCrypto: any
let mockCreateHash: any
let mockDb: any
let mockUser: any
let mockSession: any
let mockCreateError: any
let mockSetCookie: any

describe('server/utils/auth', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const bcrypt = await import('bcrypt')
    const crypto = await import('node:crypto')
    const h3 = await import('h3')
    const db = await import('~~/server/db')
    const schema = await import('~~/server/db/schema')

    mockBcrypt = bcrypt.default
    mockCrypto = crypto
    mockCreateHash = crypto.createHash as ReturnType<typeof vi.fn>
    mockDb = db.db
    mockUser = schema.user
    mockSession = schema.session
    mockCreateError = h3.createError as ReturnType<typeof vi.fn>
    mockSetCookie = h3.setCookie as ReturnType<typeof vi.fn>

    // Мок crypto.randomUUID уже настроен глобально
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash password with bcrypt and salt rounds', async () => {
      const password = 'test-password'
      const hashedPassword = 'hashed-password'

      mockBcrypt.hash.mockResolvedValue(hashedPassword)

      const result = await hashPassword(password)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(hashedPassword)
    })

    it('should handle bcrypt errors', async () => {
      const password = 'test-password'
      const error = new Error('Bcrypt error')

      mockBcrypt.hash.mockRejectedValue(error)

      await expect(hashPassword(password)).rejects.toThrow('Bcrypt error')
    })
  })

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      const password = 'test-password'
      const hash = 'test-hash'

      mockBcrypt.compare.mockResolvedValue(true)

      const result = await verifyPassword(password, hash)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash)
      expect(result).toBe(true)
    })

    it('should return false for invalid password', async () => {
      const password = 'wrong-password'
      const hash = 'test-hash'

      mockBcrypt.compare.mockResolvedValue(false)

      const result = await verifyPassword(password, hash)

      expect(result).toBe(false)
    })

    it('should handle bcrypt compare errors', async () => {
      const password = 'test-password'
      const hash = 'test-hash'
      const error = new Error('Compare error')

      mockBcrypt.compare.mockRejectedValue(error)

      await expect(verifyPassword(password, hash)).rejects.toThrow('Compare error')
    })
  })

  describe('generateSessionToken', () => {
    it('should generate random session token', () => {
      const mockBuffer = {
        toString: vi.fn().mockReturnValue('mock-token'),
      }
      mockCrypto.randomBytes.mockReturnValue(mockBuffer)

      const result = generateSessionToken()

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32)
      expect(mockBuffer.toString).toHaveBeenCalledWith('base64url')
      expect(result).toBe('mock-token')
    })
  })

  describe('findUser', () => {
    it('should find user by username', async () => {
      const username = 'testuser'
      const mockUserData = {
        id: 'user-id',
        username: 'testuser',
        passwordHash: 'hash',
        mainCurrency: 'USD',
      }

      mockDb.query.user.findFirst.mockResolvedValue(mockUserData)

      const result = await findUser(username)

      expect(mockDb.query.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: { id: true, username: true, passwordHash: true, mainCurrency: true },
        }),
      )
      expect(result).toEqual(mockUserData)
    })

    it('should return undefined if user not found', async () => {
      mockDb.query.user.findFirst.mockResolvedValue(undefined)

      const result = await findUser('nonexistent')

      expect(result).toBeUndefined()
    })
  })

  describe('createUser', () => {
    it('should create new user successfully', async () => {
      const username = 'newuser'
      const password = 'password'
      const mainCurrency = 'EUR'
      const now = new Date('2025-01-01T00:00:00Z')
      const hashedPassword = 'hashed-password'
      const createdUser = {
        id: 'user-id',
        username,
        passwordHash: hashedPassword,
        mainCurrency,
      }

      mockBcrypt.hash.mockResolvedValue(hashedPassword)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })
      mockDb.query.user.findFirst.mockResolvedValue(createdUser)

      const result = await createUser(username, password, mainCurrency, now)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(mockDb.insert).toHaveBeenCalledWith(mockUser)
      expect(result).toEqual(createdUser)
    })

    it('should throw error if user creation fails', async () => {
      const username = 'newuser'
      const password = 'password'
      const mainCurrency = 'EUR'
      const now = new Date()
      const hashedPassword = 'hashed-password'

      mockBcrypt.hash.mockResolvedValue(hashedPassword)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })
      mockDb.query.user.findFirst.mockResolvedValue(undefined)
      mockCreateError.mockReturnValue(new Error('Failed to create user'))

      await expect(createUser(username, password, mainCurrency, now))
        .rejects.toThrow('Failed to create user')
    })
  })

  describe('ensureUser', () => {
    it('should return existing user with valid password', async () => {
      const username = 'existinguser'
      const password = 'password'
      const mainCurrency = 'USD'
      const now = new Date()
      const existingUser = {
        id: 'user-id',
        username,
        passwordHash: 'hash',
        mainCurrency: 'USD',
      }

      mockDb.query.user.findFirst.mockResolvedValue(existingUser)
      mockBcrypt.compare.mockResolvedValue(true)

      const result = await ensureUser(username, password, mainCurrency, now)

      expect(result).toEqual(existingUser)
    })

    it('should create new user if not exists', async () => {
      const username = 'newuser'
      const password = 'password'
      const mainCurrency = 'EUR'
      const now = new Date()
      const newUser = {
        id: 'new-user-id',
        username,
        passwordHash: 'new-hash',
        mainCurrency,
      }

      mockDb.query.user.findFirst
        .mockResolvedValueOnce(undefined) // findUser in ensureUser
        .mockResolvedValueOnce(newUser) // findUser in createUser
      mockBcrypt.hash.mockResolvedValue('new-hash')
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const result = await ensureUser(username, password, mainCurrency, now)

      expect(result).toEqual(newUser)
    })

    it('should throw error for existing user with invalid password', async () => {
      const username = 'existinguser'
      const password = 'wrongpassword'
      const mainCurrency = 'USD'
      const now = new Date()
      const existingUser = {
        id: 'user-id',
        username,
        passwordHash: 'hash',
        mainCurrency: 'USD',
      }

      mockDb.query.user.findFirst.mockResolvedValue(existingUser)
      mockBcrypt.compare.mockResolvedValue(false)
      mockCreateError.mockReturnValue(new Error('Invalid credentials'))

      await expect(ensureUser(username, password, mainCurrency, now))
        .rejects.toThrow('Invalid credentials')
    })
  })

  describe('createSession', () => {
    it('should create session and return token', async () => {
      const userId = 'user-id'
      const now = new Date('2025-01-01T00:00:00Z')
      const token = 'session-token'
      const tokenHash = 'token-hash'

      const mockHashInstance = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(tokenHash),
      }
      mockCreateHash.mockReturnValue(mockHashInstance)
      mockCrypto.randomBytes.mockReturnValue({
        toString: vi.fn().mockReturnValue(token),
      })
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      const result = await createSession(userId, now)

      expect(mockCreateHash).toHaveBeenCalledWith('sha256')
      expect(mockHashInstance.update).toHaveBeenCalledWith(token)
      expect(mockHashInstance.digest).toHaveBeenCalledWith('hex')
      expect(mockDb.insert).toHaveBeenCalledWith(mockSession)
      expect(result).toBe(token)
    })
  })

  describe('setAuthCookie', () => {
    it('should set auth cookie with correct options in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const mockEvent = {} as any
      const token = 'auth-token'

      setAuthCookie(mockEvent, token)

      expect(mockSetCookie).toHaveBeenCalledWith(mockEvent, 'auth-token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })

      process.env.NODE_ENV = originalEnv
    })

    it('should set secure cookie in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const mockEvent = {} as any
      const token = 'auth-token'

      setAuthCookie(mockEvent, token)

      expect(mockSetCookie).toHaveBeenCalledWith(mockEvent, 'auth-token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })

      process.env.NODE_ENV = originalEnv
    })
  })
})
