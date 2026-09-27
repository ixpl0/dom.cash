import { z } from 'zod'
import { createError, getRouterParam } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { getEntryWithMonth, updateEntry } from '~~/server/services/budget/entries'
import { requireBudgetWriteAccess } from '~~/server/services/budget/access'
import { sendNotification } from '~~/server/services/notifications'
import { currencySchema, descriptionSchema, amountSchema } from '~~/shared/schemas/common'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const updateEntrySchema = z.object({
  description: descriptionSchema,
  amount: amountSchema,
  currency: currencySchema,
  date: z.string().optional(),
  isOptional: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
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

  await requireBudgetWriteAccess(entryRecord.month.userId, currentUser, event, ERROR_KEYS.INSUFFICIENT_PERMISSIONS_UPDATE)

  const updatedEntry = await updateEntry(entryId, {
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    date: data.date,
    isOptional: data.isOptional,
  }, event)

  await sendNotification(event, {
    sourceUserId: currentUser.id,
    budgetOwnerId: entryRecord.month.userId,
    type: 'budget_entry_updated',
    params: {
      username: currentUser.username,
      description: data.description,
      kind: entryRecord.entry.kind,
      amount: data.amount,
      entryCurrency: data.currency,
    },
  })

  return updatedEntry
})
