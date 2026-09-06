import { eq, and } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { unsubscribeFromBudget } from '~~/server/services/notifications'

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  const shareId = getRouterParam(event, 'id')
  if (!shareId) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.SHARE_ID_REQUIRED,
    })
  }

  const removedShares = await db
    .delete(budgetShare)
    .where(and(
      eq(budgetShare.id, shareId),
      eq(budgetShare.sharedWithId, currentUser.id),
    ))
    .returning({ ownerId: budgetShare.ownerId })

  for (const { ownerId } of removedShares) {
    unsubscribeFromBudget(currentUser.id, ownerId)
  }

  return { success: true }
})
