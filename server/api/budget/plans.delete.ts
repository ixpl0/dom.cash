import { createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { findUserByUsername } from '~~/server/services/budget/months'
import { deletePlan } from '~~/server/services/budget/plans'
import { checkBudgetWritePermission } from '~~/server/utils/auth'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(0).max(11),
  targetUsername: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const currentUser = await requireAuth(event)
    const { year, month, targetUsername } = await parseBody(event, bodySchema)

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

    const removed = await deletePlan(targetUserId, year, month, event)

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
      secureLog.error('Error creating plan delete notification:', notificationError)
    }

    return { success: removed }
  }
  catch (error) {
    secureLog.error('Delete plan error:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_UPDATE_PLAN,
    })
  }
})
