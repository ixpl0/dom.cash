import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/db'
import { month } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'

const createMonthSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(0).max(11),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { year, month: monthNumber } = await parseBody(event, createMonthSchema)

  const existingMonth = await db
    .select()
    .from(month)
    .where(and(
      eq(month.userId, user.id),
      eq(month.year, year),
      eq(month.month, monthNumber),
    ))
    .limit(1)

  if (existingMonth.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Month already exists',
    })
  }

  const newMonth = await db
    .insert(month)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      year,
      month: monthNumber,
    })
    .returning()

  return newMonth[0]
})
