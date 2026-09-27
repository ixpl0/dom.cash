import { z } from 'zod'
import { createError, isError } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { createMonth } from '~~/server/services/budget/months'
import { resolveBudget } from '~~/server/services/budget/access'
import { sendNotification } from '~~/server/services/notifications'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { MONTH_KEYS } from '~~/shared/types/i18n'

const createMonthSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(0).max(11),
  copyFromMonthId: z.string().optional(),
  username: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const { year, month: monthNumber, copyFromMonthId, username } = await parseBody(event, createMonthSchema)

  const { owner } = await resolveBudget(event, currentUser, username, 'write', ERROR_KEYS.INSUFFICIENT_PERMISSIONS_CREATE_MONTHS)

  try {
    const createdMonth = await createMonth({
      year,
      month: monthNumber,
      copyFromMonthId,
      targetUserId: owner.id,
    }, event)

    await sendNotification(event, {
      sourceUserId: currentUser.id,
      budgetOwnerId: owner.id,
      type: 'budget_month_added',
      params: {
        username: currentUser.username,
        month: MONTH_KEYS[monthNumber],
        year,
      },
    })

    return createdMonth
  }
  catch (error) {
    if (isError(error)) {
      throw error
    }

    secureLog.error('Error creating month:', error)

    if (error instanceof Error && error.message === 'Month already exists') {
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
})
