import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/db'
import { month, entry } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'

const createMonthSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(0).max(11),
  copyFromMonthId: z.string().optional(),
})

const copyBalanceEntriesFromMonth = async (sourceMonthId: string, targetMonthId: string): Promise<void> => {
  const balanceEntriesToCopy = await db
    .select()
    .from(entry)
    .where(and(
      eq(entry.monthId, sourceMonthId),
      eq(entry.kind, 'balance'),
    ))

  if (balanceEntriesToCopy.length > 0) {
    const copiedEntries = balanceEntriesToCopy.map(sourceEntry => ({
      id: crypto.randomUUID(),
      monthId: targetMonthId,
      kind: sourceEntry.kind,
      description: sourceEntry.description,
      amount: sourceEntry.amount,
      currency: sourceEntry.currency,
      date: sourceEntry.date,
    }))

    await db.insert(entry).values(copiedEntries)
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { year, month: monthNumber, copyFromMonthId } = await parseBody(event, createMonthSchema)

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

  const [createdMonth] = await db
    .insert(month)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      year,
      month: monthNumber,
    })
    .returning()

  if (!createdMonth) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create month',
    })
  }

  if (copyFromMonthId) {
    await copyBalanceEntriesFromMonth(copyFromMonthId, createdMonth.id)
  }

  return createdMonth
})
