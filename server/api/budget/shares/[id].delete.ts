import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const shareId = getRouterParam(event, 'id')
  if (!shareId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Share ID is required',
    })
  }

  const existingShare = await db
    .select({
      id: budgetShare.id,
      username: user.username,
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
      statusMessage: 'Share not found',
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
    const { createNotification } = await import('~~/server/services/notifications')
    await createNotification({
      sourceUserId: currentUser.id,
      budgetOwnerId: currentUser.id,
      type: 'budget_share_updated',
      message: `${currentUser.username} отозвал доступ к бюджету у пользователя ${shareData.username}`,
    })
  }
  catch (error) {
    console.error('Error creating notification:', error)
  }

  return { success: true }
})
