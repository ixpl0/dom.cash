import { createError, isError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseQuery } from '~~/server/utils/validation'
import { getUserPlans } from '~~/server/services/budget/plans'
import { resolveBudget } from '~~/server/services/budget/access'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const querySchema = z.object({
  username: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  const query = parseQuery(event, querySchema)

  const { owner } = await resolveBudget(event, currentUser, query.username, 'read')

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
