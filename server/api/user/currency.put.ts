import { updateUserCurrency } from '~~/server/services/users'
import { requireAuth } from '~~/server/utils/session'
import { z } from 'zod'

const UpdateCurrencySchema = z.object({
  currency: z.string().length(3).regex(/^[A-Z]{3}$/, 'Currency must be 3 uppercase letters'),
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
        statusMessage: 'Invalid currency format',
      })
    }

    const { currency, targetUsername } = validation.data

    let targetUserId = user.id

    if (targetUsername) {
      const { findUserByUsername, getExistingShare } = await import('~~/server/services/sharing')

      const targetUser = await findUserByUsername(targetUsername)
      if (!targetUser) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Target user not found',
        })
      }

      if (targetUser.id !== user.id) {
        const share = await getExistingShare(targetUser.id, user.id)
        if (!share || share.access !== 'write') {
          throw createError({
            statusCode: 403,
            statusMessage: 'No permission to update this user currency',
          })
        }
      }

      targetUserId = targetUser.id
    }

    await updateUserCurrency(targetUserId, currency)

    try {
      const { createNotification } = await import('~~/server/services/notifications')
      await createNotification({
        sourceUserId: user.id,
        budgetOwnerId: targetUserId,
        type: 'budget_currency_changed',
        message: `${user.username} изменил основную валюту бюджета на ${currency}`,
      })
    }
    catch (error) {
      console.error('Error creating notification:', error)
    }

    return { success: true }
  }
  catch (error) {
    console.error('Update currency error:', error)

    if (error instanceof Error && error.message.includes('User not found')) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found',
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update currency',
    })
  }
})
