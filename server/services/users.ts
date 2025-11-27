import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { user, budgetShare } from '~~/server/db/schema'
import { getUserMonths } from './months'

export const findUserByUsername = async (username: string, event: H3Event) => {
  const db = useDatabase(event)
  const users = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  return users[0] || null
}

export const checkReadPermission = async (targetUserId: string, requesterId: string, event: H3Event): Promise<boolean> => {
  if (targetUserId === requesterId) {
    return true
  }

  const db = useDatabase(event)
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

export const getShareAccess = async (ownerId: string, requesterId: string, event: H3Event) => {
  if (ownerId === requesterId) {
    return 'owner' as const
  }

  const db = useDatabase(event)
  const shareRecord = await db
    .select({ access: budgetShare.access })
    .from(budgetShare)
    .where(and(
      eq(budgetShare.ownerId, ownerId),
      eq(budgetShare.sharedWithId, requesterId),
    ))
    .limit(1)

  return shareRecord[0]?.access || null
}

export const getUserBudgetData = async (username: string, requesterId: string, event: H3Event) => {
  const targetUser = await findUserByUsername(username, event)
  if (!targetUser) {
    throw new Error('User not found')
  }

  const access = await getShareAccess(targetUser.id, requesterId, event)
  if (!access) {
    throw new Error('Insufficient permissions to view budget')
  }

  const months = await getUserMonths(targetUser.id, event)

  return {
    user: {
      id: targetUser.id,
      username: targetUser.username,
      mainCurrency: targetUser.mainCurrency,
    },
    access,
    months,
  }
}

export const updateUserCurrency = async (userId: string, currency: string, event: H3Event): Promise<void> => {
  const db = useDatabase(event)
  await db
    .update(user)
    .set({ mainCurrency: currency })
    .where(eq(user.id, userId))
}

export const findUserById = async (userId: string, event: H3Event) => {
  const db = useDatabase(event)
  const users = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  return users[0] || null
}
