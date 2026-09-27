import { z } from 'zod'
import { createError, isError } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { updateUserCurrency } from '~~/server/services/auth/users'
import { resolveBudget } from '~~/server/services/budget/access'
import { sendNotification } from '~~/server/services/notifications'
import { currencySchema } from '~~/shared/schemas/common'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const updateCurrencySchema = z.object({
  currency: currencySchema,
  username: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  const { currency, username } = await parseBody(event, updateCurrencySchema, ERROR_KEYS.INVALID_CURRENCY_FORMAT)
  const { owner } = await resolveBudget(event, currentUser, username, 'write', ERROR_KEYS.NO_PERMISSION_UPDATE_CURRENCY)

  try {
    await updateUserCurrency(owner.id, currency, event)

    await sendNotification(event, {
      sourceUserId: currentUser.id,
      budgetOwnerId: owner.id,
      type: 'budget_currency_changed',
      params: {
        username: currentUser.username,
        currency,
      },
    })

    return { success: true }
  }
  catch (error) {
    secureLog.error('Update currency error:', error)

    if (isError(error)) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_UPDATE_CURRENCY,
    })
  }
})
