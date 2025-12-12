import { requireAuth } from '~~/server/utils/session'
import { deleteMonth } from '~~/server/services/budget/months'
import { checkBudgetWritePermission } from '~~/server/utils/auth'
import { useDatabase } from '~~/server/db'
import { month } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  try {
    const user = await requireAuth(event)
    const monthId = getRouterParam(event, 'id')

    if (!monthId) {
      throw createError({
        statusCode: 400,
        message: ERROR_KEYS.MONTH_ID_REQUIRED,
      })
    }

    const monthRecord = await db
      .select({ userId: month.userId, year: month.year, month: month.month })
      .from(month)
      .where(eq(month.id, monthId))
      .limit(1)

    if (monthRecord.length === 0) {
      throw createError({
        statusCode: 404,
        message: ERROR_KEYS.MONTH_NOT_FOUND,
      })
    }

    const monthData = monthRecord[0]!
    const hasPermission = await checkBudgetWritePermission(monthData.userId, user.id, event)

    if (!hasPermission) {
      throw createError({
        statusCode: 403,
        message: ERROR_KEYS.NO_PERMISSION_DELETE_MONTH,
      })
    }

    await deleteMonth(monthId, event)

    try {
      const { createNotification } = await import('~~/server/services/notifications')
      const { MONTH_KEYS } = await import('~~/shared/types/i18n')
      await createNotification({
        sourceUserId: user.id,
        budgetOwnerId: monthData.userId,
        type: 'budget_month_deleted',
        params: {
          username: user.username,
          month: MONTH_KEYS[monthData.month],
          year: monthData.year,
        },
      })
    }
    catch (error) {
      secureLog.error('Error creating notification:', error)
    }

    return { success: true }
  }
  catch (error) {
    secureLog.error('Delete month error:', error)

    if (error instanceof Error) {
      if (error.message === 'Month not found' || error.message === ERROR_KEYS.MONTH_NOT_FOUND) {
        throw createError({
          statusCode: 404,
          message: ERROR_KEYS.MONTH_NOT_FOUND,
        })
      }

      throw createError({
        statusCode: 500,
        message: ERROR_KEYS.FAILED_TO_DELETE_MONTH,
      })
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_DELETE_MONTH,
    })
  }
})
