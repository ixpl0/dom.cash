import { eq, or } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import type { MemoConnection } from '~~/shared/types/memo'

export default defineEventHandler(async (event): Promise<MemoConnection[]> => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  const shares = await db
    .select({
      ownerId: budgetShare.ownerId,
      sharedWithId: budgetShare.sharedWithId,
    })
    .from(budgetShare)
    .where(or(
      eq(budgetShare.ownerId, currentUser.id),
      eq(budgetShare.sharedWithId, currentUser.id),
    ))

  const connectedUserIds = new Set<string>()
  shares.forEach((share) => {
    if (share.ownerId !== currentUser.id) {
      connectedUserIds.add(share.ownerId)
    }
    if (share.sharedWithId !== currentUser.id) {
      connectedUserIds.add(share.sharedWithId)
    }
  })

  if (connectedUserIds.size === 0) {
    return []
  }

  const userIds = [...connectedUserIds]
  const users = await db
    .select({
      id: user.id,
      username: user.username,
    })
    .from(user)
    .where(or(...userIds.map(id => eq(user.id, id))))

  return users
})
