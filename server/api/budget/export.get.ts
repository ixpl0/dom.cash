import { createError, getQuery, isError, setHeader } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { exportBudget } from '~~/server/services/budget/import-export'
import { resolveBudget } from '~~/server/services/budget/access'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const exportQuerySchema = z.object({
  username: z.string().min(1).optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  const parsedQuery = exportQuerySchema.safeParse(getQuery(event))
  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.INVALID_QUERY_PARAMETERS,
    })
  }

  const { owner } = await resolveBudget(event, currentUser, parsedQuery.data.username, 'read')

  try {
    const exportData = await exportBudget(owner.id, event)

    setHeader(event, 'Content-Type', 'application/json')

    return exportData
  }
  catch (error) {
    if (isError(error)) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_EXPORT_BUDGET,
    })
  }
})
