import { z } from 'zod'
import { db } from '~~/server/db'
import { entry, month } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { eq } from 'drizzle-orm'

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

  const monthData = await db
    .select()
    .from(month)
    .where(eq(month.id, data.monthId))
    .limit(1)

  if (monthData.length === 0 || monthData[0]?.userId !== user.id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Month not found',
    })
  }

  const newEntry = await db
    .insert(entry)
    .values({
      id: crypto.randomUUID(),
      monthId: data.monthId,
      kind: data.kind,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      date: data.date || null,
    })
    .returning()

  return newEntry[0]
})
