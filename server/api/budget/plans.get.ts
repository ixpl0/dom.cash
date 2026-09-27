import { createError, getQuery, isError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { getUserPlans } from '~~/server/services/budget/plans'
import { resolveBudget } from '~~/server/services/budget/access'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const querySchema = z.object({
  username: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.INVALID_QUERY_PARAMETERS,
    })
  }

  const { owner } = await resolveBudget(event, currentUser, parsed.data.username, 'read')

  try {
    const plans = await getUserPlans(owner.id, event)
    return { plans }
  }
  catch (error) {
    secureLog.error('Get plans error:', error)

    if (isError(error)) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.INTERNAL_SERVER_ERROR,
    })
  }
})
