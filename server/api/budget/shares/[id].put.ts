import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'
import { accessSchema } from '~~/shared/schemas/common'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { parseBody } from '~~/server/utils/validation'
import { sendNotification } from '~~/server/services/notifications'

const updateShareSchema = z.object({
  access: accessSchema,
})

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

  const { access } = await parseBody(event, updateShareSchema)

  const [shareData] = await db
    .select({
      username: user.username,
      userId: user.id,
    })
    .from(budgetShare)
    .innerJoin(user, eq(budgetShare.sharedWithId, user.id))
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
    .update(budgetShare)
    .set({ access })
    .where(and(
      eq(budgetShare.id, shareId),
      eq(budgetShare.ownerId, currentUser.id),
    ))

  await sendNotification(event, {
    sourceUserId: currentUser.id,
    budgetOwnerId: currentUser.id,
    type: 'budget_share_updated',
    params: {
      username: currentUser.username,
      access,
    },
    targetUserId: shareData.userId,
  })

  return {
    id: shareId,
    username: shareData.username,
    access,
  }
})
