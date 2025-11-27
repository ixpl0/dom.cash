import { eq, and } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { secureLog } from '~~/server/utils/secure-logger'
import { createNotification } from '~~/server/services/notifications'

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const shareId = getRouterParam(event, 'id')
  if (!shareId) {
    throw createError({
      statusCode: 400,
      message: 'Share ID is required',
    })
  }

  const existingShare = await db
    .select({
      id: budgetShare.id,
      username: user.username,
      userId: user.id,
      access: budgetShare.access,
    })
    .from(budgetShare)
    .innerJoin(user, eq(budgetShare.sharedWithId, user.id))
    .where(and(
      eq(budgetShare.id, shareId),
      eq(budgetShare.ownerId, currentUser.id),
    ))
    .limit(1)

  if (existingShare.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Share not found',
    })
  }

  const shareData = existingShare[0]!

  await db
    .delete(budgetShare)
    .where(and(
      eq(budgetShare.id, shareId),
      eq(budgetShare.ownerId, currentUser.id),
    ))

  try {
    await createNotification({
      sourceUserId: currentUser.id,
      sourceUsername: currentUser.username,
      budgetOwnerId: shareData.userId,
      budgetOwnerUsername: shareData.username,
      type: 'budget_share_updated',
      message: `${currentUser.username} отозвал у вас доступ к бюджету`,
    }, event)
  }
  catch (error) {
    secureLog.error('Error creating notification:', error)
  }

  return { success: true }
})
