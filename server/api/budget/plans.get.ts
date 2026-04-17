import { createError, getQuery } from 'h3'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { getUserPlans } from '~~/server/services/budget/plans'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const querySchema = z.object({
  username: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireAuth(event)
    const parsed = querySchema.safeParse(getQuery(event))

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: ERROR_KEYS.INVALID_QUERY_PARAMETERS,
      })
    }

    const targetUsername = parsed.data.username

    if (!targetUsername) {
      const plans = await getUserPlans(currentUser.id, event)
      return { plans }
    }

    const db = useDatabase(event)
    const targetUsers = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, targetUsername))
      .limit(1)

    const targetUser = targetUsers[0]
    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: ERROR_KEYS.USER_NOT_FOUND,
      })
    }

    if (targetUser.id !== currentUser.id) {
      const shareRecord = await db
        .select({ access: budgetShare.access })
        .from(budgetShare)
        .where(and(
          eq(budgetShare.ownerId, targetUser.id),
          eq(budgetShare.sharedWithId, currentUser.id),
        ))
        .limit(1)

      if (shareRecord.length === 0) {
        throw createError({
          statusCode: 403,
          message: ERROR_KEYS.ACCESS_DENIED,
        })
      }
    }

    const plans = await getUserPlans(targetUser.id, event)
    return { plans }
  }
  catch (error) {
    secureLog.error('Get plans error:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.INTERNAL_SERVER_ERROR,
    })
  }
})
