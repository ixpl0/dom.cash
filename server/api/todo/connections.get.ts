import { eq, inArray } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import type { TodoConnection } from '~~/shared/types/todo'

export default defineEventHandler(async (event): Promise<TodoConnection[]> => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

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
