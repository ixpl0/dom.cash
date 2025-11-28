import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { createMonth, findUserByUsername, checkWritePermission } from '~~/server/services/months'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

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
        message: ERROR_KEYS.TARGET_USER_NOT_FOUND,
      })
    }

    if (targetUser.id !== currentUser.id) {
      const hasPermission = await checkWritePermission(targetUser.id, currentUser.id, event)
      if (!hasPermission) {
        throw createError({
          statusCode: 403,
          message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_CREATE_MONTHS,
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
          message: ERROR_KEYS.MONTH_ALREADY_EXISTS,
        })
      }
      throw createError({
        statusCode: 500,
        message: ERROR_KEYS.FAILED_TO_CREATE_MONTH,
      })
    }
    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_CREATE_MONTH,
    })
  }
})
