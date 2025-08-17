import { requireAuth } from '~~/server/utils/session'
import { deleteMonth, checkWritePermission } from '~~/server/services/months'
import { db } from '~~/server/db'
import { month } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event)
    const monthId = getRouterParam(event, 'id')

    if (!monthId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Month ID is required',
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
        statusMessage: 'Month not found',
      })
    }

    const monthData = monthRecord[0]!
    const hasPermission = await checkWritePermission(monthData.userId, user.id)

    if (!hasPermission) {
      throw createError({
        statusCode: 403,
        statusMessage: 'No permission to delete this month',
      })
    }

    await deleteMonth(monthId)

    try {
      const { createNotification } = await import('~~/server/services/notifications')
      const monthNames = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
      await createNotification({
        sourceUserId: user.id,
        budgetOwnerId: monthData.userId,
        type: 'budget_month_deleted',
        message: `${user.username} удалил ${monthNames[monthData.month]} ${monthData.year} из бюджета`,
      })
    }
    catch (error) {
      console.error('Error creating notification:', error)
    }

    return { success: true }
  }
  catch (error) {
    console.error('Delete month error:', error)

    if (error instanceof Error && error.message === 'Month not found') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Month not found',
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete month',
    })
  }
})
