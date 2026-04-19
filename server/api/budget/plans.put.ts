import { createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { findUserByUsername } from '~~/server/services/budget/months'
import { upsertPlan } from '~~/server/services/budget/plans'
import { checkBudgetWritePermission } from '~~/server/utils/auth'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { isPastMonth } from '~~/shared/utils/budget/month-helpers'

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(0).max(11),
  plannedBalanceChange: z.number().int().nullable(),
  targetUsername: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireAuth(event)
    const { year, month, plannedBalanceChange, targetUsername } = await parseBody(event, bodySchema)

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
        const hasPermission = await checkBudgetWritePermission(targetUser.id, currentUser.id, event)
        if (!hasPermission) {
          throw createError({
            statusCode: 403,
            message: ERROR_KEYS.NO_PERMISSION_UPDATE_PLAN,
          })
        }
      }

      targetUserId = targetUser.id
    }

    if (isPastMonth(year, month)) {
      throw createError({
        statusCode: 400,
        message: ERROR_KEYS.CANNOT_PLAN_PAST_MONTH,
      })
    }

    const saved = await upsertPlan(targetUserId, year, month, plannedBalanceChange, event)

    try {
      const { createNotification } = await import('~~/server/services/notifications')
      const { MONTH_KEYS } = await import('~~/shared/types/i18n')
      await createNotification({
        sourceUserId: currentUser.id,
        budgetOwnerId: targetUserId,
        type: 'budget_plan_updated',
        params: {
          username: currentUser.username,
          month: MONTH_KEYS[month],
          year,
        },
      })
    }
    catch (notificationError) {
      secureLog.error('Error creating plan update notification:', notificationError)
    }

    return saved
  }
  catch (error) {
    secureLog.error('Upsert plan error:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_UPDATE_PLAN,
    })
  }
})
