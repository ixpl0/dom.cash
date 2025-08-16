import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/db'
import { user, budgetShare } from '~~/server/db/schema'
import { getUserMonths } from './months'

export const findUserByUsername = async (username: string) => {
  const users = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  return users[0] || null
}

export const checkReadPermission = async (targetUserId: string, requesterId: string): Promise<boolean> => {
  if (targetUserId === requesterId) {
    return true
  }

  const shareRecord = await db
    .select({ access: budgetShare.access })
    .from(budgetShare)
    .where(and(
      eq(budgetShare.ownerId, targetUserId),
      eq(budgetShare.sharedWithId, requesterId),
    ))
    .limit(1)

  return shareRecord.length > 0
}

export const getUserBudgetData = async (username: string, requesterId: string) => {
  const targetUser = await findUserByUsername(username)
  if (!targetUser) {
    throw new Error('User not found')
  }

  const hasReadPermission = await checkReadPermission(targetUser.id, requesterId)
  if (!hasReadPermission) {
    throw new Error('Insufficient permissions to view budget')
  }

  return await getUserMonths(targetUser.id)
}

export const updateUserCurrency = async (userId: string, currency: string): Promise<void> => {
  await db
    .update(user)
    .set({ mainCurrency: currency })
    .where(eq(user.id, userId))
}
