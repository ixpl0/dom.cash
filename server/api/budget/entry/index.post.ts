import { defineEventHandler, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { entry, month } from '~~/server/db/schema'
import { parseBody } from '~~/server/utils/validation'
import { requireAuth } from '~~/server/utils/session'
import { createEntrySchema } from '~~/server/schemas/budget'

export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const data = await parseBody(event, createEntrySchema)
  const [m] = await db.select().from(month).where(eq(month.id, data.monthId))
  if (!m || m.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const id = crypto.randomUUID()
  await db.insert(entry).values({
    id,
    monthId: data.monthId,
    kind: data.kind,
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    date: data.date,
  })
  return {
    id,
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    date: data.date || '',
  }
})

