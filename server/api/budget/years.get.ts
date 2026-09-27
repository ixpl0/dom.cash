import { createError, getQuery } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { getAvailableYears, getInitialYearsToLoad } from '~~/server/services/budget/months'
import { resolveBudget } from '~~/server/services/budget/access'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import type { YearsData } from '~~/shared/types/budget'

const querySchema = z.object({
  username: z.string().optional(),
})

export default defineEventHandler(async (event): Promise<YearsData> => {
  const currentUser = await requireAuth(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.INVALID_QUERY_PARAMETERS,
    })
  }

  const { owner } = await resolveBudget(event, currentUser, parsed.data.username, 'read', ERROR_KEYS.INSUFFICIENT_PERMISSIONS_VIEW)
  const availableYears = await getAvailableYears(owner.id, event)

  return {
    availableYears,
    initialYears: getInitialYearsToLoad(availableYears),
  }
})
