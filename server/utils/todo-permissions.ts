import { eq } from 'drizzle-orm'
import type { useDatabase } from '~~/server/db'
import { budgetShare } from '~~/server/db/schema'

export const getTodoRecipientIds = async (
  db: ReturnType<typeof useDatabase>,
  userId: string,
): Promise<Set<string>> => {
  const shares = await db
    .select({ ownerId: budgetShare.ownerId })
    .from(budgetShare)
    .where(eq(budgetShare.sharedWithId, userId))

  return new Set(shares.map(share => share.ownerId))
}
