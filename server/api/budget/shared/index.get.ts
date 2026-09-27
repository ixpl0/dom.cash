import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  const currentUser = await requireAuth(event)

  const sharedBudgets = await db
    .select({
      id: budgetShare.id,
      username: user.username,
      access: budgetShare.access,
      createdAt: budgetShare.createdAt,
    })
    .from(budgetShare)
    .innerJoin(user, eq(budgetShare.ownerId, user.id))
    .where(eq(budgetShare.sharedWithId, currentUser.id))

  return sharedBudgets
})
