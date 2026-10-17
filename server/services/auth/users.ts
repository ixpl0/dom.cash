import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { oauthAuthorizationCode, oauthGrant, session, user } from '~~/server/db/schema'
import { secureLog } from '~~/server/utils/secure-logger'
import type { User } from '~~/shared/types'

export const replaceUserPassword = async (userId: string, passwordHash: string, event: H3Event): Promise<void> => {
  const db = useDatabase(event)
  await db.batch([
    db.update(user).set({ passwordHash }).where(eq(user.id, userId)),
    db.delete(session).where(eq(session.userId, userId)),
    db.delete(oauthGrant).where(eq(oauthGrant.userId, userId)),
    db.delete(oauthAuthorizationCode).where(eq(oauthAuthorizationCode.userId, userId)),
  ])
}

export const updateUserActivity = async (userId: string, event: H3Event): Promise<void> => {
  const db = useDatabase(event)
  await db
    .update(user)
    .set({ lastActivityAt: new Date() })
    .where(eq(user.id, userId))
}

export const recordUserActivity = (currentUser: User, event: H3Event): void => {
  if (currentUser.impersonatedBy) {
    return
  }

  event.waitUntil(updateUserActivity(currentUser.id, event).catch((error: unknown) => {
    secureLog.error('Failed to record user activity:', error)
  }))
}
