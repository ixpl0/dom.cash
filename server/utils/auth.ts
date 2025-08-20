import { createHash } from 'node:crypto'
import { createError, setCookie, getCookie, type H3Event } from 'h3'
import { eq, gt, and } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { user, session } from '~~/server/db/schema'

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
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
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
      ['deriveBits']
    )

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      key,
      256
    )

    const newHash = new Uint8Array(derivedBits)
    return hash.length === newHash.length && hash.every((byte, i) => byte === newHash[i])
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
    columns: { id: true, username: true, passwordHash: true, mainCurrency: true },
  })
}

export const createUser = async (username: string, password: string, mainCurrency: string, now: Date, event: H3Event) => {
  const database = useDatabase(event)
  const passwordHash = await hashPassword(password)

  await database.insert(user).values({
    id: crypto.randomUUID(),
    username,
    passwordHash,
    mainCurrency,
    createdAt: now,
  })

  const created = await findUser(username, event)
  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create user' })
  }
  return created
}

export const ensureUser = async (username: string, password: string, mainCurrency: string, now: Date, event: H3Event) => {
  const existing = await findUser(username, event)

  if (!existing) {
    return await createUser(username, password, mainCurrency, now, event)
  }

  const isPasswordValid = await verifyPassword(password, existing.passwordHash)

  if (!isPasswordValid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  return existing
}

export const createSession = async (userId: string, now: Date, event: H3Event): Promise<string> => {
  const database = useDatabase(event)
  const token = generateSessionToken()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await database.insert(session).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    createdAt: now,
    expiresAt,
  })

  return token
}

export const setAuthCookie = (event: H3Event, token: string) => {
  setCookie(event, 'auth-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export const getUserFromRequest = async (event: H3Event) => {
  const database = useDatabase(event)
  const token = getCookie(event, 'auth-token')
  if (!token) {
    return null
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const now = new Date()

  const sessionData = await database
    .select({
      userId: session.userId,
    })
    .from(session)
    .where(and(
      eq(session.tokenHash, tokenHash),
      gt(session.expiresAt, now),
    ))
    .limit(1)

  if (sessionData.length === 0) {
    return null
  }

  const sessionInfo = sessionData[0]
  if (!sessionInfo) {
    return null
  }

  const userData = await database
    .select({
      id: user.id,
      username: user.username,
      mainCurrency: user.mainCurrency,
    })
    .from(user)
    .where(eq(user.id, sessionInfo.userId))
    .limit(1)

  if (userData.length === 0) {
    return null
  }

  const userInfo = userData[0]
  if (!userInfo) {
    return null
  }

  return userInfo
}
