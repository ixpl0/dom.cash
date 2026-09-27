import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseQuery } from '~~/server/utils/validation'
import { getBudgetView } from '~~/server/services/budget/budget-view'
import { updateUserActivity } from '~~/server/services/auth/users'
import type { BudgetData } from '~~/shared/types/budget'

const querySchema = z.object({
  years: z.string().optional(),
})

export default defineEventHandler(async (event): Promise<BudgetData> => {
  const currentUser = await requireAuth(event)

  const query = parseQuery(event, querySchema)

  const budget = await getBudgetView(event, currentUser, undefined, query.years)

  if (!currentUser.impersonatedBy) {
    await updateUserActivity(currentUser.id, event)
  }

  return budget
})
