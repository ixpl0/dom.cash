import { createError, isError, setHeader } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseQuery } from '~~/server/utils/validation'
import { exportBudget } from '~~/server/services/budget/import-export'
import { resolveBudget } from '~~/server/services/budget/access'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const exportQuerySchema = z.object({
  username: z.string().min(1).optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  const query = parseQuery(event, exportQuerySchema)

  const { owner } = await resolveBudget(event, currentUser, query.username, 'read')

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
