import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  const shares = await db
    .select({
      id: budgetShare.id,
      username: user.username,
      access: budgetShare.access,
      createdAt: budgetShare.createdAt,
    })
    .from(budgetShare)
    .innerJoin(user, eq(budgetShare.sharedWithId, user.id))
    .where(eq(budgetShare.ownerId, currentUser.id))

  return shares
})
