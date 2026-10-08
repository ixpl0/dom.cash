import { timingSafeEqual } from 'node:crypto'
import { createError, setCookie, type H3Event } from 'h3'
import { eq, lte, sql } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { user, session } from '~~/server/db/schema'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { hashToken, timingSafeCompare } from '~~/server/utils/crypto'

export const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 90
export const SESSION_LIFETIME_MS = SESSION_LIFETIME_SECONDS * 1000
export const REFRESH_INTERVAL_SECONDS = 60 * 60 * 24
export const REFRESH_INTERVAL_MS = REFRESH_INTERVAL_SECONDS * 1000

const toBase64 = (data: Uint8Array): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data).toString('base64')
  }
  return btoa(String.fromCharCode(...data))
}

const fromBase64 = (data: string): Uint8Array => {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(data, 'base64'))
  }
  return new Uint8Array(atob(data).split('').map(c => c.charCodeAt(0)))
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const encoder = new TextEncoder()
  const passwordData = encoder.encode(password)

  const key = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256,
  )

  const hash = new Uint8Array(derivedBits)
  const combined = new Uint8Array(salt.length + hash.length)
  combined.set(salt, 0)
  combined.set(hash, salt.length)

  return toBase64(combined)
}

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    const combined = fromBase64(hashedPassword)
    const salt = combined.slice(0, 16)
    const hash = combined.slice(16)

    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)

    const key = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits'],
    )

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      key,
      256,
    )

    const newHash = new Uint8Array(derivedBits)

    if (hash.length !== newHash.length) {
      return false
    }

    if (typeof Buffer !== 'undefined') {
      return timingSafeEqual(Buffer.from(hash), Buffer.from(newHash))
    }

    return timingSafeCompare(hash, newHash)
  }
  catch {
    return false
  }
}

export const generateSessionToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return toBase64(bytes).replace(/[+/]/g, c => c === '+' ? '-' : '_').replace(/=/g, '')
}

const authUserColumns = {
  id: user.id,
  username: user.username,
  passwordHash: user.passwordHash,
  googleId: user.googleId,
  mainCurrency: user.mainCurrency,
  isAdmin: user.isAdmin,
}

export const normalizeUsername = (username: string): string => username.trim().toLowerCase()

export const findUser = async (username: string, event: H3Event) => {
  const [foundUser] = await useDatabase(event)
    .select(authUserColumns)
    .from(user)
    .where(sql`lower(${user.username}) = ${normalizeUsername(username)}`)
    .limit(1)

  return foundUser
}

type CreateUserParams = {
  username: string
  passwordHash?: string
  googleId?: string
  emailVerified?: boolean
  mainCurrency?: string
}

export const createUserInDb = async (event: H3Event, params: CreateUserParams) => {
  const [created] = await useDatabase(event)
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      username: normalizeUsername(params.username),
      mainCurrency: params.mainCurrency ?? 'USD',
      createdAt: new Date(),
      isAdmin: false,
      passwordHash: params.passwordHash,
      googleId: params.googleId,
      emailVerified: params.emailVerified ?? false,
    })
    .onConflictDoNothing()
    .returning(authUserColumns)

  if (!created) {
    throw createError({ statusCode: 409, message: ERROR_KEYS.USER_ALREADY_EXISTS })
  }

  return created
}

export const createGoogleUser = async (username: string, googleId: string, event: H3Event) => {
  return createUserInDb(event, { username, googleId, emailVerified: true })
}

export const findUserByGoogleId = async (googleId: string, event: H3Event) => {
  const database = useDatabase(event)
  return database.query.user.findFirst({
    where: eq(user.googleId, googleId),
    columns: { id: true, username: true, googleId: true, mainCurrency: true, isAdmin: true },
  })
}

export const createSession = async (userId: string, now: Date, event: H3Event): Promise<string> => {
  const database = useDatabase(event)
  const token = generateSessionToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_SECONDS * 1000)

  await database.batch([
    database.delete(session).where(lte(session.expiresAt, now)),
    database.insert(session).values({
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      createdAt: now,
      expiresAt,
    }),
  ])

  return token
}

export const setAuthCookie = (event: H3Event, token: string, maxAge: number = SESSION_LIFETIME_SECONDS) => {
  const isProduction = process.env.NODE_ENV === 'production'

  setCookie(event, 'auth-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge,
  })
}
