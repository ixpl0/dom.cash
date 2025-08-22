import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'

const updateShareSchema = z.object({
  access: z.enum(['read', 'write']),
})

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
      message: 'Share not found',
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
      message: 'Share not found',
    })
  }

  try {
    const { createNotification } = await import('~~/server/services/notifications')
    const accessNames: Record<string, string> = { read: 'только чтение', write: 'чтение и редактирование' }
    await createNotification({
      sourceUserId: currentUser.id,
      budgetOwnerId: currentUser.id,
      type: 'budget_share_updated',
      message: `${currentUser.username} изменил ваши права доступа к бюджету на "${accessNames[access] || access}"`,
      targetUserId: shareData.userId,
    })
  }
  catch (error) {
    console.error('Error creating notification:', error)
  }

  return {
    id: shareId,
    username: shareData.username,
    access,
  }
})
