import { createHash, timingSafeEqual } from 'node:crypto'
import { createError, setCookie, getCookie, type H3Event } from 'h3'
import { eq, gt, and } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { user, session } from '~~/server/db/schema'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

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

const timingSafeCompare = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) {
    return false
  }

  let diff = 0

  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!
  }

  return diff === 0
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

export const findUser = async (username: string, event: H3Event) => {
  const database = useDatabase(event)
  return database.query.user.findFirst({
    where: eq(user.username, username),
    columns: { id: true, username: true, passwordHash: true, googleId: true, mainCurrency: true, isAdmin: true },
  })
}

type CreateUserParams = {
  username: string
  passwordHash?: string
  googleId?: string
  emailVerified?: boolean
  mainCurrency?: string
}

export const createUserInDb = async (event: H3Event, params: CreateUserParams) => {
  const database = useDatabase(event)
  const mainCurrency = params.mainCurrency ?? 'USD'
  const emailVerified = params.emailVerified ?? false
  const createdAt = new Date()

  await database.insert(user).values({
    id: crypto.randomUUID(),
    username: params.username,
    mainCurrency,
    createdAt,
    isAdmin: false,
    passwordHash: params.passwordHash,
    googleId: params.googleId,
    emailVerified,
  })

  const created = await findUser(params.username, event)

  if (!created) {
    throw createError({ statusCode: 500, message: ERROR_KEYS.FAILED_TO_CREATE_USER })
  }

  return created
}

export const createUser = async (username: string, password: string, event: H3Event) => {
  const passwordHash = await hashPassword(password)

  return createUserInDb(event, { username, passwordHash })
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

export const ensureUser = async (username: string, password: string, event: H3Event) => {
  const existing = await findUser(username, event)

  if (!existing) {
    return await createUser(username, password, event)
  }

  if (!existing.passwordHash) {
    throw createError({ statusCode: 401, message: ERROR_KEYS.ACCOUNT_EXISTS_GOOGLE })
  }

  const isPasswordValid = await verifyPassword(password, existing.passwordHash)

  if (!isPasswordValid) {
    throw createError({ statusCode: 401, message: ERROR_KEYS.INVALID_CREDENTIALS })
  }

  return existing
}

export const createSession = async (userId: string, now: Date, event: H3Event): Promise<string> => {
  const database = useDatabase(event)
  const token = generateSessionToken()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_SECONDS * 1000)

  await database.insert(session).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    createdAt: now,
    expiresAt,
  })

  return token
}

export const setAuthCookie = (event: H3Event, token: string, maxAge: number = SESSION_LIFETIME_SECONDS) => {
  const isProduction = process.env.NODE_ENV === 'production'
  const isLocalhost = event.node?.req?.headers?.host?.includes('localhost')

  setCookie(event, 'auth-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction && !isLocalhost,
    path: '/',
    maxAge,
  })
}

export const getUserFromRequest = async (event: H3Event) => {
  const token = getCookie(event, 'auth-token')
  if (!token) {
    return null
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const now = new Date()

  const db = useDatabase(event)
  const [userRecord] = await db
    .select({
      id: user.id,
      username: user.username,
      mainCurrency: user.mainCurrency,
      isAdmin: user.isAdmin,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(and(
      eq(session.tokenHash, tokenHash),
      gt(session.expiresAt, now),
    ))
    .limit(1)

  return userRecord || null
}
