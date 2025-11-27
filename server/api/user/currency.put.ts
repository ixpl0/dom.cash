import { updateUserCurrency, findUserById } from '~~/server/services/users'
import { requireAuth } from '~~/server/utils/session'
import { z } from 'zod'
import { currencySchema } from '~~/shared/schemas/common'
import { createNotification } from '~~/server/services/notifications'
import { secureLog } from '~~/server/utils/secure-logger'

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
        message: 'Invalid currency format',
      })
    }

    const { currency, targetUsername } = validation.data

    let targetUserId = user.id

    if (targetUsername) {
      const { findUserByUsername, getExistingShare } = await import('~~/server/services/sharing')

      const targetUser = await findUserByUsername(targetUsername, event)
      if (!targetUser) {
        throw createError({
          statusCode: 404,
          message: 'Target user not found',
        })
      }

      if (targetUser.id !== user.id) {
        const share = await getExistingShare(targetUser.id, user.id, event)
        if (!share || share.access !== 'write') {
          throw createError({
            statusCode: 403,
            message: 'No permission to update this user currency',
          })
        }
      }

      targetUserId = targetUser.id
    }

    await updateUserCurrency(targetUserId, currency, event)

    try {
      const budgetOwner = await findUserById(targetUserId, event)
      await createNotification({
        sourceUserId: user.id,
        sourceUsername: user.username,
        budgetOwnerId: targetUserId,
        budgetOwnerUsername: budgetOwner?.username || 'unknown',
        type: 'budget_currency_changed',
        message: `${user.username} изменил основную валюту бюджета на ${currency}`,
      }, event)
    }
    catch (error) {
      secureLog.error('Error creating notification:', error)
    }

    return { success: true }
  }
  catch (error) {
    secureLog.error('Update currency error:', error)

    if (error instanceof Error && error.message.includes('User not found')) {
      throw createError({
        statusCode: 404,
        message: 'User not found',
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to update currency',
    })
  }
})
