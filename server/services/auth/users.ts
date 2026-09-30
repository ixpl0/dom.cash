import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { user } from '~~/server/db/schema'
import { secureLog } from '~~/server/utils/secure-logger'
import type { User } from '~~/shared/types'

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
