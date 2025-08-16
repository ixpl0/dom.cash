import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/db'
import { entry, month, budgetShare } from '~~/server/db/schema'
import type { EntryKind } from '~~/server/db/schema'

export interface CreateEntryParams {
  monthId: string
  kind: EntryKind
  description: string
  amount: number
  currency: string
  date?: string
}

export interface UpdateEntryParams {
  description: string
  amount: number
  currency: string
  date?: string
}

export const getMonthOwner = async (monthId: string) => {
  const monthData = await db
    .select()
    .from(month)
    .where(eq(month.id, monthId))
    .limit(1)

  return monthData[0] || null
}

export const getEntryWithMonth = async (entryId: string) => {
  const entryData = await db
    .select({
      entry,
      month,
    })
    .from(entry)
    .leftJoin(month, eq(entry.monthId, month.id))
    .where(eq(entry.id, entryId))
    .limit(1)

  const result = entryData[0]
  return result?.month ? result : null
}

export const checkWritePermissionForMonth = async (monthOwnerId: string, userId: string): Promise<boolean> => {
  if (monthOwnerId === userId) {
    return true
  }

  const shareRecord = await db
    .select({ access: budgetShare.access })
    .from(budgetShare)
    .where(and(
      eq(budgetShare.ownerId, monthOwnerId),
      eq(budgetShare.sharedWithId, userId),
    ))
    .limit(1)

  return shareRecord.length > 0 && shareRecord[0]?.access === 'write'
}

export const createEntry = async (params: CreateEntryParams) => {
  const newEntry = await db
    .insert(entry)
    .values({
      id: crypto.randomUUID(),
      monthId: params.monthId,
      kind: params.kind,
      description: params.description,
      amount: params.amount,
      currency: params.currency,
      date: params.date || null,
    })
    .returning()

  return newEntry[0]
}

export const updateEntry = async (entryId: string, params: UpdateEntryParams) => {
  const updatedEntry = await db
    .update(entry)
    .set({
      ...params,
      date: params.date || null,
    })
    .where(eq(entry.id, entryId))
    .returning()

  return updatedEntry[0]
}

export const deleteEntry = async (entryId: string) => {
  const deletedEntry = await db
    .delete(entry)
    .where(eq(entry.id, entryId))
    .returning()

  return deletedEntry[0]
}
