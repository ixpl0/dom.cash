import { defineEventHandler, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { entry, month } from '~~/server/db/schema'
import { parseBody } from '~~/server/utils/validation'
import { requireAuth } from '~~/server/utils/session'
import { updateEntrySchema } from '~~/server/schemas/budget'

export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }
  const data = await parseBody(event, updateEntrySchema)
  const [existing] = await db.select().from(entry).where(eq(entry.id, id))
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const [m] = await db.select().from(month).where(eq(month.id, existing.monthId))
  if (!m || m.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  await db.update(entry).set({
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    date: data.date,
  }).where(eq(entry.id, id))
  return {
    id,
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    date: data.date || '',
  }
})

