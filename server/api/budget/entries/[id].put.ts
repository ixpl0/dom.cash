import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { getEntryWithMonth, updateEntry } from '~~/server/services/budget/entries'
import { checkBudgetWritePermission } from '~~/server/utils/auth'
import { currencySchema, descriptionSchema, amountSchema } from '~~/shared/schemas/common'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const updateEntrySchema = z.object({
  description: descriptionSchema,
  amount: amountSchema,
  currency: currencySchema,
  date: z.string().optional(),
  isOptional: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const entryId = getRouterParam(event, 'id')
  const data = await parseBody(event, updateEntrySchema)

  if (!entryId) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.ENTRY_ID_REQUIRED,
    })
  }

  const entryRecord = await getEntryWithMonth(entryId, event)
  if (!entryRecord || !entryRecord.month) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.ENTRY_NOT_FOUND,
    })
  }

  const hasPermission = await checkBudgetWritePermission(entryRecord.month.userId, user.id, event)
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_UPDATE,
    })
  }

  const updatedEntry = await updateEntry(entryId, {
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
      budgetOwnerId: entryRecord.month.userId,
      type: 'budget_entry_updated',
      params: {
        username: user.username,
        description: data.description,
        kind: entryRecord.entry.kind,
        amount: data.amount,
        entryCurrency: data.currency,
      },
    })
  }
  catch (error) {
    secureLog.error('Error creating notification:', error)
  }

  return updatedEntry
})
