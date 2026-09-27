import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { getBudgetView } from '~~/server/services/budget/budget-view'
import { updateUserActivity } from '~~/server/services/auth/users'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import type { BudgetData } from '~~/shared/types/budget'

const querySchema = z.object({
  years: z.string().optional(),
})

export default defineEventHandler(async (event): Promise<BudgetData> => {
  const currentUser = await requireAuth(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.INVALID_QUERY_PARAMETERS,
    })
  }

  const budget = await getBudgetView(event, currentUser, undefined, parsed.data.years)

  if (!currentUser.impersonatedBy) {
    await updateUserActivity(currentUser.id, event)
  }

  return budget
})
