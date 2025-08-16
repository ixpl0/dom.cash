import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { getEntryWithMonth, checkWritePermissionForMonth, updateEntry } from '~~/server/services/entries'

const updateEntrySchema = z.object({
  description: z.string().min(1).max(255),
  amount: z.number().positive(),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  date: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const entryId = getRouterParam(event, 'id')
  const data = await parseBody(event, updateEntrySchema)

  if (!entryId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Entry ID is required',
    })
  }

  const entryRecord = await getEntryWithMonth(entryId)
  if (!entryRecord || !entryRecord.month) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Entry not found',
    })
  }

  const hasPermission = await checkWritePermissionForMonth(entryRecord.month.userId, user.id)
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to update entries',
    })
  }

  return await updateEntry(entryId, {
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    date: data.date,
  })
})
