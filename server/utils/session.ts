import { createHash } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { createError, getCookie, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { session, user } from '~~/server/db/schema'
import { REFRESH_INTERVAL_MS, SESSION_LIFETIME_MS, setAuthCookie } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { resolveImpersonation } from '~~/server/utils/impersonation'
import type { User } from '~~/shared/types'

const AUTH_COOKIE_NAME = 'auth-token'

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')

const needsRefresh = (expiresAt: Date, now: Date): boolean => {
  const isLegacySession = expiresAt.getTime() - now.getTime() > SESSION_LIFETIME_MS
  const lastRefreshedAt = expiresAt.getTime() - SESSION_LIFETIME_MS
  return isLegacySession || now.getTime() - lastRefreshedAt > REFRESH_INTERVAL_MS
}

export const getSessionUser = async (event: H3Event): Promise<User | null> => {
  const token = getCookie(event, AUTH_COOKIE_NAME)

  if (!token) {
    return null
  }

  const now = new Date()
  const db = useDatabase(event)
  const [record] = await db
    .select({
      sessionId: session.id,
      sessionExpiresAt: session.expiresAt,
      userId: user.id,
      username: user.username,
      mainCurrency: user.mainCurrency,
      isAdmin: user.isAdmin,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(and(
      eq(session.tokenHash, hashToken(token)),
      gt(session.expiresAt, now),
    ))
    .limit(1)

  if (!record) {
    return null
  }

  if (needsRefresh(record.sessionExpiresAt, now)) {
    await db
      .update(session)
      .set({ expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS) })
      .where(eq(session.id, record.sessionId))

    setAuthCookie(event, token)
  }

  const sessionUser: User = {
    id: record.userId,
    username: record.username,
    mainCurrency: record.mainCurrency,
    isAdmin: record.isAdmin,
  }

  const impersonatedUser = await resolveImpersonation(event, sessionUser)

  return impersonatedUser ?? sessionUser
}

export const requireAuth = async (event: H3Event): Promise<User> => {
  const currentUser = await getSessionUser(event)

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  return currentUser
}
