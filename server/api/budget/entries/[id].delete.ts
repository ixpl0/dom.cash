import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { entry, month } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const entryId = getRouterParam(event, 'id')

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

  await db
    .delete(entry)
    .where(eq(entry.id, entryId))

  return { success: true }
})
