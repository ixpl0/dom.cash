import { defineEventHandler, createError, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/session'
import { useDatabase } from '~~/server/db'
import { user } from '~~/server/db/schema'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  if (!currentUser.isAdmin) {
    throw createError({ statusCode: 403, message: ERROR_KEYS.FORBIDDEN })
  }

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ statusCode: 400, message: ERROR_KEYS.USER_ID_REQUIRED })
  }

  if (userId === currentUser.id) {
    throw createError({ statusCode: 400, message: ERROR_KEYS.CANNOT_DELETE_YOURSELF })
  }

  const db = useDatabase(event)

  const [targetUser] = await db
    .select({ id: user.id, isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!targetUser) {
    throw createError({ statusCode: 404, message: ERROR_KEYS.USER_NOT_FOUND })
  }

  if (targetUser.isAdmin) {
    throw createError({ statusCode: 403, message: ERROR_KEYS.CANNOT_DELETE_ADMIN })
  }

  await db.delete(user).where(eq(user.id, userId))

  return { success: true }
})
