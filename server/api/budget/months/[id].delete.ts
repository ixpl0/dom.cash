import { eq } from 'drizzle-orm'
import { createError, getRouterParam, isError } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { useDatabase } from '~~/server/db'
import { month } from '~~/server/db/schema'
import { deleteMonth } from '~~/server/services/budget/months'
import { requireBudgetWriteAccess } from '~~/server/services/budget/access'
import { sendNotification } from '~~/server/services/notifications'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { MONTH_KEYS } from '~~/shared/types/i18n'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const monthId = getRouterParam(event, 'id')

  if (!monthId) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.MONTH_ID_REQUIRED,
    })
  }

  const db = useDatabase(event)
  const [monthRecord] = await db
    .select({ userId: month.userId, year: month.year, month: month.month })
    .from(month)
    .where(eq(month.id, monthId))
    .limit(1)

  if (!monthRecord) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.MONTH_NOT_FOUND,
    })
  }

  await requireBudgetWriteAccess(monthRecord.userId, currentUser, event, ERROR_KEYS.NO_PERMISSION_DELETE_MONTH)

  try {
    await deleteMonth(monthId, event)
  }
  catch (error) {
    secureLog.error('Delete month error:', error)

    if (isError(error)) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_DELETE_MONTH,
    })
  }

  await sendNotification(event, {
    sourceUserId: currentUser.id,
    budgetOwnerId: monthRecord.userId,
    type: 'budget_month_deleted',
    params: {
      username: currentUser.username,
      month: MONTH_KEYS[monthRecord.month],
      year: monthRecord.year,
    },
  })

  return { success: true }
})
