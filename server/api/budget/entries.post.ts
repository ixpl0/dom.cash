import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { getMonthOwner, createEntry } from '~~/server/services/budget/entries'
import { checkBudgetWritePermission } from '~~/server/utils/auth'
import { currencySchema, descriptionSchema, amountSchema, entryKindSchema } from '~~/shared/schemas/common'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const createEntrySchema = z.object({
  monthId: z.uuid(),
  kind: entryKindSchema,
  description: descriptionSchema,
  amount: amountSchema,
  currency: currencySchema,
  date: z.string().optional(),
  isOptional: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const data = await parseBody(event, createEntrySchema)

  const monthOwner = await getMonthOwner(data.monthId, event)
  if (!monthOwner) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.MONTH_NOT_FOUND,
    })
  }

  const hasPermission = await checkBudgetWritePermission(monthOwner.userId, user.id, event)
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_ADD,
    })
  }

  const entry = await createEntry({
    monthId: data.monthId,
    kind: data.kind,
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    date: data.date,
    isOptional: data.isOptional,
  }, event)

  try {
    const { createNotification } = await import('~~/server/services/notifications')
    await createNotification({
      sourceUserId: user.id,
      budgetOwnerId: monthOwner.userId,
      type: 'budget_entry_created',
      params: {
        username: user.username,
        description: data.description,
        kind: data.kind,
        amount: data.amount,
        entryCurrency: data.currency,
      },
    })
  }
  catch (error) {
    secureLog.error('Error creating notification:', error)
  }

  return entry
})
