import { updateUserCurrency } from '~~/server/services/auth/users'
import { requireAuth } from '~~/server/utils/session'
import { z } from 'zod'
import { currencySchema } from '~~/shared/schemas/common'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const UpdateCurrencySchema = z.object({
  currency: currencySchema,
  targetUsername: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event)

    const body = await readBody(event)
    const validation = UpdateCurrencySchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        message: ERROR_KEYS.INVALID_CURRENCY_FORMAT,
      })
    }

    const { currency, targetUsername } = validation.data

    let targetUserId = user.id

    if (targetUsername) {
      const { findUserByUsername, getExistingShare } = await import('~~/server/services/budget/sharing')

      const targetUser = await findUserByUsername(targetUsername, event)
      if (!targetUser) {
        throw createError({
          statusCode: 404,
          message: ERROR_KEYS.TARGET_USER_NOT_FOUND,
        })
      }

      if (targetUser.id !== user.id) {
        const share = await getExistingShare(targetUser.id, user.id, event)
        if (!share || share.access !== 'write') {
          throw createError({
            statusCode: 403,
            message: ERROR_KEYS.NO_PERMISSION_UPDATE_CURRENCY,
          })
        }
      }

      targetUserId = targetUser.id
    }

    await updateUserCurrency(targetUserId, currency, event)

    try {
      const { createNotification } = await import('~~/server/services/notifications')
      await createNotification({
        sourceUserId: user.id,
        budgetOwnerId: targetUserId,
        type: 'budget_currency_changed',
        params: {
          username: user.username,
          currency,
        },
      })
    }
    catch (error) {
      const { secureLog } = await import('~~/server/utils/secure-logger')
      secureLog.error('Error creating notification:', error)
    }

    return { success: true }
  }
  catch (error) {
    const { secureLog } = await import('~~/server/utils/secure-logger')
    secureLog.error('Update currency error:', error)

    if (error instanceof Error && error.message.includes('User not found')) {
      throw createError({
        statusCode: 404,
        message: ERROR_KEYS.USER_NOT_FOUND,
      })
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_UPDATE_CURRENCY,
    })
  }
})
