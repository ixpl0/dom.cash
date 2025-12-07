import type { H3Event } from 'h3'
import { getCookie } from 'h3'
import { createHash } from 'node:crypto'
import { eq, and, gt } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { user, session } from '~~/server/db/schema'
import { SESSION_LIFETIME_SECONDS, REFRESH_INTERVAL_SECONDS, setAuthCookie } from '~~/server/utils/auth'

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

    const lastRefreshed = record.sessionExpiresAt.getTime() - SESSION_LIFETIME_SECONDS * 1000
    const timeSinceRefresh = now.getTime() - lastRefreshed

    if (timeSinceRefresh > REFRESH_INTERVAL_SECONDS * 1000) {
      const newExpiresAt = new Date(now.getTime() + SESSION_LIFETIME_SECONDS * 1000)

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
