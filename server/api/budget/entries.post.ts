import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { getMonthOwner, getEntryWithMonth, createEntry, updateEntry } from '~~/server/services/budget/entries'
import { requireBudgetWriteAccess } from '~~/server/services/budget/access'
import { sendNotification } from '~~/server/services/notifications'
import { currencySchema, descriptionSchema, amountSchema, entryKindSchema } from '~~/shared/schemas/common'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const createEntrySchema = z.object({
  id: z.uuid().optional(),
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

  await requireBudgetWriteAccess(monthOwner.userId, user, event, ERROR_KEYS.INSUFFICIENT_PERMISSIONS_ADD)

  if (data.id) {
    const existingRecord = await getEntryWithMonth(data.id, event)
    if (existingRecord) {
      if (existingRecord.entry.monthId !== data.monthId || existingRecord.entry.kind !== data.kind) {
        throw createError({
          statusCode: 409,
          message: ERROR_KEYS.ENTRY_CONFLICT,
        })
      }

      const retriedEntry = await updateEntry(data.id, {
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        date: data.date,
        isOptional: data.isOptional,
      }, event)

      if (!retriedEntry) {
        throw createError({
          statusCode: 404,
          message: ERROR_KEYS.ENTRY_NOT_FOUND,
        })
      }

      return retriedEntry
    }
  }

  const entry = await createEntry({
    id: data.id,
    monthId: data.monthId,
    kind: data.kind,
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    date: data.date,
    isOptional: data.isOptional,
  }, event)

  if (!entry) {
    const concurrentRecord = data.id ? await getEntryWithMonth(data.id, event) : null
    if (concurrentRecord && concurrentRecord.entry.monthId === data.monthId && concurrentRecord.entry.kind === data.kind) {
      return concurrentRecord.entry
    }
    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.INTERNAL_SERVER_ERROR,
    })
  }

  await sendNotification(event, {
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

  return entry
})
