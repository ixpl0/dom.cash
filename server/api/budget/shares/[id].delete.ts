import { eq, and } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { sendNotification, unsubscribeFromBudget } from '~~/server/services/notifications'

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  const currentUser = await requireAuth(event)

  const shareId = getRouterParam(event, 'id')
  if (!shareId) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.SHARE_ID_REQUIRED,
    })
  }

  const [shareData] = await db
    .select({ userId: budgetShare.sharedWithId })
    .from(budgetShare)
    .where(and(
      eq(budgetShare.id, shareId),
      eq(budgetShare.ownerId, currentUser.id),
    ))
    .limit(1)

  if (!shareData) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.SHARE_NOT_FOUND,
    })
  }

  await db
    .delete(budgetShare)
    .where(and(
      eq(budgetShare.id, shareId),
      eq(budgetShare.ownerId, currentUser.id),
    ))

  unsubscribeFromBudget(shareData.userId, currentUser.id)

  await sendNotification(event, {
    sourceUserId: currentUser.id,
    budgetOwnerId: currentUser.id,
    type: 'budget_share_revoked',
    params: {
      username: currentUser.username,
    },
    targetUserId: shareData.userId,
  })

  return { success: true }
})
