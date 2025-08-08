import bcrypt from 'bcrypt'
import { randomBytes, createHash } from 'node:crypto'
import { createError, setCookie, type H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { user, session } from '~~/server/db/schema'

const SALT_ROUNDS = 12

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const generateSessionToken = (): string => {
  return randomBytes(32).toString('base64url')
}

export const findUser = async (username: string) => {
  return db.query.user.findFirst({
    where: eq(user.username, username),
    columns: { id: true, username: true, passwordHash: true, mainCurrency: true },
  })
}

export const createUser = async (username: string, password: string, mainCurrency: string, now: Date) => {
  const passwordHash = await hashPassword(password)

  await db.insert(user).values({
    id: crypto.randomUUID(),
    username,
    passwordHash,
    mainCurrency,
    createdAt: now,
  })

  const created = await findUser(username)
  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create user' })
  }
  return created
}

export const ensureUser = async (username: string, password: string, mainCurrency: string, now: Date) => {
  const existing = await findUser(username)

  if (!existing) {
    return await createUser(username, password, mainCurrency, now)
  }

  const isPasswordValid = await verifyPassword(password, existing.passwordHash)

  if (!isPasswordValid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  return existing
}

export const createSession = async (userId: string, now: Date) => {
  const token = generateSessionToken()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await db.insert(session).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    createdAt: now,
    expiresAt,
  })

  return { token, expiresAt }
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
