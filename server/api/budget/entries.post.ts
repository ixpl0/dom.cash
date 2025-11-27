import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { getMonthOwner, checkWritePermissionForMonth, createEntry } from '~~/server/services/entries'
import { currencySchema, descriptionSchema, amountSchema, entryKindSchema } from '~~/shared/schemas/common'
import { secureLog } from '~~/server/utils/secure-logger'
import { createNotification } from '~~/server/services/notifications'
import { findUserById } from '~~/server/services/users'

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
      message: 'Month not found',
    })
  }

  const hasPermission = await checkWritePermissionForMonth(monthOwner.userId, user.id, event)
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions to add entries',
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
    const budgetOwner = await findUserById(monthOwner.userId, event)
    const kindNames = { balance: 'баланс', income: 'доход', expense: 'расход' }
    await createNotification({
      sourceUserId: user.id,
      sourceUsername: user.username,
      budgetOwnerId: monthOwner.userId,
      budgetOwnerUsername: budgetOwner?.username || 'unknown',
      type: 'budget_entry_created',
      message: `${user.username} добавил запись "${data.description}" (${kindNames[data.kind]}: ${data.amount} ${data.currency})`,
    }, event)
  }
  catch (error) {
    secureLog.error('Error creating notification:', error)
  }

  return entry
})
