import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { getEntryWithMonth, checkWritePermissionForMonth, updateEntry } from '~~/server/services/entries'
import { currencySchema, descriptionSchema, amountSchema } from '~~/shared/schemas/common'
import { secureLog } from '~~/server/utils/secure-logger'
import { createNotification } from '~~/server/services/notifications'
import { findUserById } from '~~/server/services/users'

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
      message: 'Entry ID is required',
    })
  }

  const entryRecord = await getEntryWithMonth(entryId, event)
  if (!entryRecord || !entryRecord.month) {
    throw createError({
      statusCode: 404,
      message: 'Entry not found',
    })
  }

  const hasPermission = await checkWritePermissionForMonth(entryRecord.month.userId, user.id, event)
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions to update entries',
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
    const budgetOwner = await findUserById(entryRecord.month.userId, event)
    const kindNames = { balance: 'баланс', income: 'доход', expense: 'расход' }
    await createNotification({
      sourceUserId: user.id,
      sourceUsername: user.username,
      budgetOwnerId: entryRecord.month.userId,
      budgetOwnerUsername: budgetOwner?.username || 'unknown',
      type: 'budget_entry_updated',
      message: `${user.username} изменил запись "${data.description}" (${kindNames[entryRecord.entry.kind]}: ${data.amount} ${data.currency})`,
    }, event)
  }
  catch (error) {
    secureLog.error('Error creating notification:', error)
  }

  return updatedEntry
})
