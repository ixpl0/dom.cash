import { createError, isError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseQuery } from '~~/server/utils/validation'
import { deletePlan } from '~~/server/services/budget/plans'
import { resolveBudget } from '~~/server/services/budget/access'
import { sendNotification } from '~~/server/services/notifications'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { MONTH_KEYS } from '~~/shared/types/i18n'
import { monthIndexSchema, yearSchema } from '~~/shared/schemas/budget'

const querySchema = z.object({
  year: z.coerce.number().pipe(yearSchema),
  month: z.coerce.number().pipe(monthIndexSchema),
  username: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  const { year, month, username } = parseQuery(event, querySchema)
  const { owner } = await resolveBudget(event, currentUser, username, 'write', ERROR_KEYS.NO_PERMISSION_UPDATE_PLAN)

  try {
    const removed = await deletePlan(owner.id, year, month, event)

    await sendNotification(event, {
      sourceUserId: currentUser.id,
      budgetOwnerId: owner.id,
      type: 'budget_plan_updated',
      params: {
        username: currentUser.username,
        month: MONTH_KEYS[month],
        year,
      },
    })

    return { success: removed }
  }
  catch (error) {
    secureLog.error('Delete plan error:', error)

    if (isError(error)) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_UPDATE_PLAN,
    })
  }
})
