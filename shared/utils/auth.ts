import type { H3Event } from 'h3'
import { getCookie } from 'h3'
import { createHash } from 'node:crypto'
import { eq, and, gt } from 'drizzle-orm'
import { db } from '~~/server/db'
import { user, session } from '~~/server/db/schema'

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

    const [userRecord] = await db
      .select({
        id: user.id,
        username: user.username,
        mainCurrency: user.mainCurrency,
      })
      .from(session)
      .innerJoin(user, eq(session.userId, user.id))
      .where(and(
        eq(session.tokenHash, tokenHash),
        gt(session.expiresAt, now),
      ))
      .limit(1)

    if (!userRecord) {
      return { user: null, error: 'Invalid or expired token' }
    }

    return { user: userRecord }
  }
  catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Unknown authentication error',
    }
  }
}
