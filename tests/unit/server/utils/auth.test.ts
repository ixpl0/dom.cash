import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  findUser,
  createUser,
  ensureUser,
  createSession,
  setAuthCookie,
  getUserFromRequest,
} from '~~/server/utils/auth'

vi.mock('node:crypto', () => ({
  randomBytes: vi.fn(),
  createHash: vi.fn(),
}))

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn().mockReturnValue('mock-uuid'),
    getRandomValues: vi.fn(),
    subtle: {
      importKey: vi.fn(),
      deriveBits: vi.fn(),
    },
  },
  writable: true,
})

vi.mock('h3', () => ({
  createError: vi.fn(),
  setCookie: vi.fn(),
  getCookie: vi.fn(),
}))

vi.mock('~~/server/db', () => ({
  db: {
    query: {
      user: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
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
  and: vi.fn(),
  gt: vi.fn(),
}))

let mockCrypto: any
let mockCreateHash: any
let mockDb: any
let mockUser: any
let mockSession: any
let mockCreateError: any
let mockSetCookie: any
let mockGetCookie: any

describe('server/utils/auth', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const crypto = await import('node:crypto')
    const h3 = await import('h3')
    const db = await import('~~/server/db')
    const schema = await import('~~/server/db/schema')
    mockCrypto = crypto
    mockCreateHash = crypto.createHash as ReturnType<typeof vi.fn>
    mockDb = db.db
    mockUser = schema.user
    mockSession = schema.session
    mockCreateError = h3.createError as ReturnType<typeof vi.fn>
    mockSetCookie = h3.setCookie as ReturnType<typeof vi.fn>
    mockGetCookie = h3.getCookie as ReturnType<typeof vi.fn>
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash password with PBKDF2', async () => {
      const password = 'test-password'
      const salt = new Uint8Array(16)
      const hash = new Uint8Array(32)
      const mockKey = {}

      global.crypto.getRandomValues.mockReturnValue(salt)
      global.crypto.subtle.importKey.mockResolvedValue(mockKey)
      global.crypto.subtle.deriveBits.mockResolvedValue(hash.buffer)

      global.Buffer = {
        from: vi.fn().mockReturnValue({
          toString: vi.fn().mockReturnValue('mock-hash'),
        }),
      } as any

      const result = await hashPassword(password)

      expect(global.crypto.getRandomValues).toHaveBeenCalled()
      expect(global.crypto.subtle.importKey).toHaveBeenCalledWith('raw', expect.any(Uint8Array), 'PBKDF2', false, ['deriveBits'])
      expect(global.crypto.subtle.deriveBits).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        mockKey,
        256,
      )
      expect(result).toBe('mock-hash')
    })

    it('should handle crypto errors', async () => {
      const password = 'test-password'
      const error = new Error('Crypto error')

      global.crypto.getRandomValues.mockImplementation(() => {
        throw error
      })

      await expect(hashPassword(password)).rejects.toThrow('Crypto error')
    })
  })

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      const password = 'test-password'
      const hash = 'test-hash'
      const combined = new Uint8Array(48)
      const _salt = combined.slice(0, 16)
      const _expectedHash = combined.slice(16)
      const mockKey = {}

      global.Buffer = {
        from: vi.fn().mockReturnValue(combined),
      } as any

      global.atob = vi.fn().mockReturnValue(String.fromCharCode(...combined))
      global.crypto.subtle.importKey.mockResolvedValue(mockKey)
      global.crypto.subtle.deriveBits.mockResolvedValue(expectedHash.buffer)

      const result = await verifyPassword(password, hash)

      expect(global.crypto.subtle.importKey).toHaveBeenCalledWith('raw', expect.any(Uint8Array), 'PBKDF2', false, ['deriveBits'])
      expect(global.crypto.subtle.deriveBits).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        mockKey,
        256,
      )
      expect(result).toBe(true)
    })

    it('should return false for invalid password', async () => {
      const password = 'wrong-password'
      const hash = 'test-hash'
      const combined = new Uint8Array(48)
      const _salt = combined.slice(0, 16)
      const _expectedHash = combined.slice(16)
      const wrongHash = new Uint8Array(32)
      wrongHash[0] = 1
      const mockKey = {}

      global.Buffer = {
        from: vi.fn().mockReturnValue(combined),
      } as any

      global.atob = vi.fn().mockReturnValue(String.fromCharCode(...combined))
      global.crypto.subtle.importKey.mockResolvedValue(mockKey)
      global.crypto.subtle.deriveBits.mockResolvedValue(wrongHash.buffer)

      const result = await verifyPassword(password, hash)

      expect(result).toBe(false)
    })

    it('should return false on crypto errors', async () => {
      const password = 'test-password'
      const hash = 'test-hash'
      const error = new Error('Crypto error')

      global.Buffer = {
        from: vi.fn().mockImplementation(() => {
          throw error
        }),
      } as any

      const result = await verifyPassword(password, hash)

      expect(result).toBe(false)
    })
  })

  describe('generateSessionToken', () => {
    it('should generate random session token', () => {
      const mockBytes = new Uint8Array(32)
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          ...globalThis.crypto,
          getRandomValues: vi.fn().mockReturnValue(mockBytes),
        },
        writable: true,
      })

      global.Buffer = {
        from: vi.fn().mockReturnValue({
          toString: vi.fn().mockReturnValue('mock-base64-token'),
        }),
      } as any

      const result = generateSessionToken()

      expect(result).toBe('mock-base64-token')
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

      mockArgon2.hash.mockResolvedValue(hashedPassword)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })
      mockDb.query.user.findFirst.mockResolvedValue(createdUser)

      const result = await createUser(username, password, mainCurrency, now)

      expect(mockArgon2.hash).toHaveBeenCalledWith(password, expect.any(Object))
      expect(mockDb.insert).toHaveBeenCalledWith(mockUser)
      expect(result).toEqual(createdUser)
    })

    it('should throw error if user creation fails', async () => {
      const username = 'newuser'
      const password = 'password'
      const mainCurrency = 'EUR'
      const now = new Date()
      const hashedPassword = 'hashed-password'

      mockArgon2.hash.mockResolvedValue(hashedPassword)
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
      mockArgon2.verify.mockResolvedValue(true)

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
      mockArgon2.hash.mockResolvedValue('new-hash')
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
      mockArgon2.verify.mockResolvedValue(false)
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

  describe('getUserFromRequest', () => {
    it('should return user for valid token', async () => {
      const token = 'valid-token'
      const tokenHash = 'token-hash'
      const userId = 'user-id'
      const userData = {
        id: userId,
        username: 'testuser',
        mainCurrency: 'USD',
      }

      const mockEvent = {} as any
      const mockHashInstance = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(tokenHash),
      }

      mockGetCookie.mockReturnValue(token)
      mockCreateHash.mockReturnValue(mockHashInstance)

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit
        .mockResolvedValueOnce([{ userId }])
        .mockResolvedValueOnce([userData])

      const result = await getUserFromRequest(mockEvent)

      expect(mockGetCookie).toHaveBeenCalledWith(mockEvent, 'auth-token')
      expect(mockCreateHash).toHaveBeenCalledWith('sha256')
      expect(result).toEqual(userData)
    })

    it('should return null when no token', async () => {
      const mockEvent = {} as any
      mockGetCookie.mockReturnValue(undefined)

      const result = await getUserFromRequest(mockEvent)

      expect(result).toBeNull()
    })

    it('should return null when session not found', async () => {
      const token = 'invalid-token'
      const tokenHash = 'token-hash'
      const mockEvent = {} as any
      const mockHashInstance = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(tokenHash),
      }

      mockGetCookie.mockReturnValue(token)
      mockCreateHash.mockReturnValue(mockHashInstance)

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      const result = await getUserFromRequest(mockEvent)

      expect(result).toBeNull()
    })

    it('should return null when session data is invalid', async () => {
      const token = 'valid-token'
      const tokenHash = 'token-hash'
      const mockEvent = {} as any
      const mockHashInstance = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(tokenHash),
      }

      mockGetCookie.mockReturnValue(token)
      mockCreateHash.mockReturnValue(mockHashInstance)

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValueOnce([undefined])

      const result = await getUserFromRequest(mockEvent)

      expect(result).toBeNull()
    })

    it('should return null when user not found', async () => {
      const token = 'valid-token'
      const tokenHash = 'token-hash'
      const userId = 'user-id'
      const mockEvent = {} as any
      const mockHashInstance = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(tokenHash),
      }

      mockGetCookie.mockReturnValue(token)
      mockCreateHash.mockReturnValue(mockHashInstance)

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit
        .mockResolvedValueOnce([{ userId }])
        .mockResolvedValueOnce([])

      const result = await getUserFromRequest(mockEvent)

      expect(result).toBeNull()
    })

    it('should return null when user data is invalid', async () => {
      const token = 'valid-token'
      const tokenHash = 'token-hash'
      const userId = 'user-id'
      const mockEvent = {} as any
      const mockHashInstance = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(tokenHash),
      }

      mockGetCookie.mockReturnValue(token)
      mockCreateHash.mockReturnValue(mockHashInstance)

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit
        .mockResolvedValueOnce([{ userId }])
        .mockResolvedValueOnce([undefined])

      const result = await getUserFromRequest(mockEvent)

      expect(result).toBeNull()
    })
  })
})
