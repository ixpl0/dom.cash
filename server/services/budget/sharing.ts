import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'

export const findUserByUsername = async (username: string, event: H3Event): Promise<typeof user.$inferSelect | null> => {
  const db = useDatabase(event)
  const users = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  return users[0] ?? null
}

export const getExistingShare = async (ownerId: string, sharedWithId: string, event: H3Event): Promise<typeof budgetShare.$inferSelect | null> => {
  const db = useDatabase(event)
  const shares = await db
    .select()
    .from(budgetShare)
    .where(and(
      eq(budgetShare.ownerId, ownerId),
      eq(budgetShare.sharedWithId, sharedWithId),
    ))
    .limit(1)

  return shares[0] ?? null
}
