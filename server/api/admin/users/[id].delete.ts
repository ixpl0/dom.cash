import { defineEventHandler, createError, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/session'
import { useDatabase } from '~~/server/db'
import { user } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  if (!currentUser.isAdmin) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  if (userId === currentUser.id) {
    throw createError({ statusCode: 400, message: 'Cannot delete yourself' })
  }

  const db = useDatabase(event)

  const [targetUser] = await db
    .select({ id: user.id, isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (targetUser.isAdmin) {
    throw createError({ statusCode: 403, message: 'Cannot delete admin users' })
  }

  await db.delete(user).where(eq(user.id, userId))

  return { success: true }
})
