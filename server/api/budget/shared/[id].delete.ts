import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/db'
import { budgetShare } from '~~/server/db/schema'
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

  await db
    .delete(budgetShare)
    .where(and(
      eq(budgetShare.id, shareId),
      eq(budgetShare.sharedWithId, currentUser.id),
    ))

  return { success: true }
})
