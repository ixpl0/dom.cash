import type { H3Event } from 'h3'
import { getCookie } from 'h3'
import { createHash } from 'node:crypto'
import { eq, and, gt } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { user, session } from '~~/server/db/schema'
import { SESSION_LIFETIME_MS, REFRESH_INTERVAL_MS, setAuthCookie } from '~~/server/utils/auth'

import type { User } from '~~/shared/types'

export interface ValidateTokenResult {
  user: User | null
  error?: string
}

export const validateAuthToken = async (event: H3Event): Promise<ValidateTokenResult> => {
  try {
    const token = getCookie(event, 'auth-token')

    if (!token) {
      return { user: null, error: 'No token provided' }
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')
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
        eq(session.tokenHash, tokenHash),
        gt(session.expiresAt, now),
      ))
      .limit(1)

    if (!record) {
      return { user: null, error: 'Invalid or expired token' }
    }

    const timeUntilExpiry = record.sessionExpiresAt.getTime() - now.getTime()
    const isLegacySession = timeUntilExpiry > SESSION_LIFETIME_MS

    const lastRefreshed = record.sessionExpiresAt.getTime() - SESSION_LIFETIME_MS
    const timeSinceRefresh = now.getTime() - lastRefreshed
    const needsRefresh = timeSinceRefresh > REFRESH_INTERVAL_MS

    if (isLegacySession || needsRefresh) {
      const newExpiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS)

      await db
        .update(session)
        .set({ expiresAt: newExpiresAt })
        .where(eq(session.id, record.sessionId))

      setAuthCookie(event, token)
    }

    return {
      user: {
        id: record.userId,
        username: record.username,
        mainCurrency: record.mainCurrency,
        isAdmin: record.isAdmin,
      },
    }
  }
  catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Unknown authentication error',
    }
  }
}
