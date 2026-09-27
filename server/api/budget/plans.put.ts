import { createError, isError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { upsertPlan } from '~~/server/services/budget/plans'
import { resolveBudget } from '~~/server/services/budget/access'
import { sendNotification } from '~~/server/services/notifications'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { isPastMonth } from '~~/shared/utils/budget/month-helpers'
import { MONTH_KEYS } from '~~/shared/types/i18n'

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(0).max(11),
  plannedBalanceChange: z.number().int().nullable(),
  comment: z.string().max(2000).nullable().optional(),
  username: z.string().optional(),
})

const normalizeComment = (comment: string | null | undefined): string | null => {
  const trimmedComment = comment?.trim() ?? ''
  return trimmedComment.length === 0 ? null : trimmedComment
}

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const { year, month, plannedBalanceChange, comment, username } = await parseBody(event, bodySchema)

  const { owner } = await resolveBudget(event, currentUser, username, 'write', ERROR_KEYS.NO_PERMISSION_UPDATE_PLAN)

  if (isPastMonth(year, month)) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.CANNOT_PLAN_PAST_MONTH,
    })
  }

  try {
    const saved = await upsertPlan(owner.id, year, month, plannedBalanceChange, normalizeComment(comment), event)

    await sendNotification(event, {
      sourceUserId: currentUser.id,
      budgetOwnerId: owner.id,
      type: 'budget_plan_updated',
      params: {
        username: currentUser.username,
        month: MONTH_KEYS[month],
        year,
      },
    })

    return saved
  }
  catch (error) {
    secureLog.error('Upsert plan error:', error)

    if (isError(error)) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_UPDATE_PLAN,
    })
  }
})
