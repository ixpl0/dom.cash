import { eq, inArray } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'
import type { TodoConnection } from '~~/shared/types/todo'

export default defineEventHandler(async (event): Promise<TodoConnection[]> => {
  const db = useDatabase(event)
  const currentUser = await requireAuth(event)

  const shares = await db
    .select({ ownerId: budgetShare.ownerId })
    .from(budgetShare)
    .where(eq(budgetShare.sharedWithId, currentUser.id))

  const recipientIds = shares.map(share => share.ownerId)

  if (recipientIds.length === 0) {
    return []
  }

  const users = await db
    .select({
      id: user.id,
      username: user.username,
    })
    .from(user)
    .where(inArray(user.id, recipientIds))

  return users
})
