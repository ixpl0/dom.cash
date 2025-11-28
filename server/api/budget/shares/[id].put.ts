import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { accessSchema } from '~~/shared/schemas/common'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const updateShareSchema = z.object({
  access: accessSchema,
})

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

  const body = await readBody(event)
  const { access } = updateShareSchema.parse(body)

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
      message: ERROR_KEYS.SHARE_NOT_FOUND,
    })
  }

  await db
    .update(budgetShare)
    .set({ access })
    .where(and(
      eq(budgetShare.id, shareId),
      eq(budgetShare.ownerId, currentUser.id),
    ))

  const shareData = existingShare[0]
  if (!shareData) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.SHARE_NOT_FOUND,
    })
  }

  try {
    const { createNotification } = await import('~~/server/services/notifications')
    await createNotification({
      sourceUserId: currentUser.id,
      budgetOwnerId: currentUser.id,
      type: 'budget_share_updated',
      params: {
        username: currentUser.username,
        access,
      },
      targetUserId: shareData.userId,
    })
  }
  catch (error) {
    secureLog.error('Error creating notification:', error)
  }

  return {
    id: shareId,
    username: shareData.username,
    access,
  }
})
