import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseQuery } from '~~/server/utils/validation'
import { getAvailableYears, getInitialYearsToLoad } from '~~/server/services/budget/months'
import { resolveBudget } from '~~/server/services/budget/access'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import type { YearsData } from '~~/shared/types/budget'

const querySchema = z.object({
  username: z.string().optional(),
})

export default defineEventHandler(async (event): Promise<YearsData> => {
  const currentUser = await requireAuth(event)

  const query = parseQuery(event, querySchema)

  const { owner } = await resolveBudget(event, currentUser, query.username, 'read', ERROR_KEYS.INSUFFICIENT_PERMISSIONS_VIEW)
  const availableYears = await getAvailableYears(owner.id, event)

  return {
    availableYears,
    initialYears: getInitialYearsToLoad(availableYears),
  }
})
