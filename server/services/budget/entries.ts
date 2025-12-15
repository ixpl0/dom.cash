import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { entry, month } from '~~/server/db/schema'
import type { EntryKind } from '~~/server/db/schema'

export interface CreateEntryParams {
  monthId: string
  kind: EntryKind
  description: string
  amount: number
  currency: string
  date?: string
  isOptional?: boolean
}

export interface UpdateEntryParams {
  description: string
  amount: number
  currency: string
  date?: string
  isOptional?: boolean
}

export const getMonthOwner = async (monthId: string, event: H3Event): Promise<typeof month.$inferSelect | null> => {
  const db = useDatabase(event)
  const monthData = await db
    .select()
    .from(month)
    .where(eq(month.id, monthId))
    .limit(1)

  return monthData[0] ?? null
}

interface EntryWithMonth {
  entry: typeof entry.$inferSelect
  month: typeof month.$inferSelect
}

export const getEntryWithMonth = async (entryId: string, event: H3Event): Promise<EntryWithMonth | null> => {
  const db = useDatabase(event)
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
  return result?.month ? result as EntryWithMonth : null
}

export const createEntry = async (params: CreateEntryParams, event: H3Event): Promise<typeof entry.$inferSelect | undefined> => {
  const db = useDatabase(event)
  const newEntry = await db
    .insert(entry)
    .values({
      id: crypto.randomUUID(),
      monthId: params.monthId,
      kind: params.kind,
      description: params.description,
      amount: params.amount,
      currency: params.currency,
      date: params.date ?? null,
      isOptional: params.isOptional ?? false,
    })
    .returning()

  return newEntry[0]
}

export const updateEntry = async (entryId: string, params: UpdateEntryParams, event: H3Event): Promise<typeof entry.$inferSelect | undefined> => {
  const db = useDatabase(event)
  const updatedEntry = await db
    .update(entry)
    .set({
      description: params.description,
      amount: params.amount,
      currency: params.currency,
      date: params.date ?? null,
      isOptional: params.isOptional !== undefined ? params.isOptional : undefined,
    })
    .where(eq(entry.id, entryId))
    .returning()

  return updatedEntry[0]
}

export const deleteEntry = async (entryId: string, event: H3Event): Promise<typeof entry.$inferSelect | undefined> => {
  const db = useDatabase(event)
  const deletedEntry = await db
    .delete(entry)
    .where(eq(entry.id, entryId))
    .returning()

  return deletedEntry[0]
}
