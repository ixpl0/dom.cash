import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { user } from '~~/server/db/schema'

export const updateUserActivity = async (userId: string, event: H3Event): Promise<void> => {
  const db = useDatabase(event)
  await db
    .update(user)
    .set({ lastActivityAt: new Date() })
    .where(eq(user.id, userId))
}
