import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/db'
import { entry, month } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'

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

  const entryData = await db
    .select({
      entry,
      month,
    })
    .from(entry)
    .leftJoin(month, eq(entry.monthId, month.id))
    .where(eq(entry.id, entryId))
    .limit(1)

  if (entryData.length === 0 || entryData[0]?.month?.userId !== user.id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Entry not found',
    })
  }

  const updatedEntry = await db
    .update(entry)
    .set({
      ...data,
      date: data.date || null,
    })
    .where(eq(entry.id, entryId))
    .returning()

  return updatedEntry[0]
})
