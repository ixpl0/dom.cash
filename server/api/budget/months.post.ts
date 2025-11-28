import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { createMonth, findUserByUsername, checkWritePermission } from '~~/server/services/months'
import { secureLog } from '~~/server/utils/secure-logger'

const createMonthSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(0).max(11),
  copyFromMonthId: z.string().optional(),
  targetUsername: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const { year, month: monthNumber, copyFromMonthId, targetUsername } = await parseBody(event, createMonthSchema)

  let targetUserId = currentUser.id

  if (targetUsername) {
    const targetUser = await findUserByUsername(targetUsername, event)
    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: 'Target user not found',
      })
    }

    if (targetUser.id !== currentUser.id) {
      const hasPermission = await checkWritePermission(targetUser.id, currentUser.id, event)
      if (!hasPermission) {
        throw createError({
          statusCode: 403,
          message: 'Insufficient permissions to create months',
        })
      }
    }

    targetUserId = targetUser.id
  }

  try {
    const createdMonth = await createMonth({
      year,
      month: monthNumber,
      copyFromMonthId,
      targetUserId,
    }, event)

    try {
      const { createNotification } = await import('~~/server/services/notifications')
      const { MONTH_KEYS } = await import('~~/shared/types/i18n')
      await createNotification({
        sourceUserId: currentUser.id,
        budgetOwnerId: targetUserId,
        type: 'budget_month_added',
        params: {
          username: currentUser.username,
          month: MONTH_KEYS[monthNumber],
          year,
        },
      })
    }
    catch (error) {
      secureLog.error('Error creating notification:', error)
    }

    return createdMonth
  }
  catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Month already exists') {
        throw createError({
          statusCode: 409,
          message: 'Month already exists',
        })
      }
      throw createError({
        statusCode: 500,
        message: error.message,
      })
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to create month',
    })
  }
})
