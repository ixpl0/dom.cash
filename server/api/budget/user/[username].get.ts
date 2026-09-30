import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseQuery } from '~~/server/utils/validation'
import { getBudgetView } from '~~/server/services/budget/budget-view'
import { recordUserActivity } from '~~/server/services/auth/users'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import type { BudgetData } from '~~/shared/types/budget'

const querySchema = z.object({
  years: z.string().optional(),
})

export default defineEventHandler(async (event): Promise<BudgetData> => {
  const currentUser = await requireAuth(event)

  const username = getRouterParam(event, 'username')
  if (!username) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.USERNAME_REQUIRED,
    })
  }

  const query = parseQuery(event, querySchema)

  const budget = await getBudgetView(event, currentUser, username, query.years)

  recordUserActivity(currentUser, event)

  return budget
})
