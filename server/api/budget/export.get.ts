import { requireAuth } from '~~/server/utils/session'
import { exportBudget } from '~~/server/services/import-export'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  try {
    const exportData = await exportBudget(user.id, event)

    setHeader(event, 'Content-Type', 'application/json')

    return exportData
  }
  catch {
    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_EXPORT_BUDGET,
    })
  }
})
