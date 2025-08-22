import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { getMonthOwner, checkWritePermissionForMonth, createEntry } from '~~/server/services/entries'

const createEntrySchema = z.object({
  monthId: z.uuid(),
  kind: z.enum(['balance', 'income', 'expense']),
  description: z.string().min(1).max(255),
  amount: z.number().positive(),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  date: z.string().optional(),
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
  }, event)

  try {
    const { createNotification } = await import('~~/server/services/notifications')
    const kindNames = { balance: 'баланс', income: 'доход', expense: 'расход' }
    await createNotification({
      sourceUserId: user.id,
      budgetOwnerId: monthOwner.userId,
      type: 'budget_entry_created',
      message: `${user.username} добавил запись "${data.description}" (${kindNames[data.kind]}: ${data.amount} ${data.currency})`,
    })
  }
  catch (error) {
    console.error('Error creating notification:', error)
  }

  return entry
})
