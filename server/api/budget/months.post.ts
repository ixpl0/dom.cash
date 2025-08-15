import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/db'
import { month, entry, budgetShare, user } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'

const createMonthSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(0).max(11),
  copyFromMonthId: z.string().optional(),
  targetUsername: z.string().optional(),
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
  const currentUser = await requireAuth(event)
  const { year, month: monthNumber, copyFromMonthId, targetUsername } = await parseBody(event, createMonthSchema)

  let targetUserId = currentUser.id

  if (targetUsername) {
    const targetUser = await db
      .select()
      .from(user)
      .where(eq(user.username, targetUsername))
      .limit(1)

    if (targetUser.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Target user not found',
      })
    }

    const targetUserData = targetUser[0]
    if (!targetUserData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Target user not found',
      })
    }

    if (targetUserData.id !== currentUser.id) {
      const shareRecord = await db
        .select({ access: budgetShare.access })
        .from(budgetShare)
        .where(and(
          eq(budgetShare.ownerId, targetUserData.id),
          eq(budgetShare.sharedWithId, currentUser.id),
        ))
        .limit(1)

      if (shareRecord.length === 0 || shareRecord[0]?.access !== 'write') {
        throw createError({
          statusCode: 403,
          statusMessage: 'Insufficient permissions to create months',
        })
      }
    }

    targetUserId = targetUserData.id
  }

  const existingMonth = await db
    .select()
    .from(month)
    .where(and(
      eq(month.userId, targetUserId),
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
      userId: targetUserId,
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
