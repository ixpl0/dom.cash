import { and, eq } from 'drizzle-orm'
import { createError, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { budgetShare, type user } from '~~/server/db/schema'
import { findUser } from '~~/server/utils/auth'
import { ERROR_KEYS, type ErrorKey } from '~~/shared/utils/shared/error-keys'
import type { User } from '~~/shared/types'
import type { BudgetAccess } from '~~/shared/types/budget'
import type { AccessLevel } from '~~/shared/schemas/common'

export type BudgetOwner = Pick<typeof user.$inferSelect, 'id' | 'username' | 'mainCurrency'>

export interface ResolvedBudget {
  owner: BudgetOwner
  access: BudgetAccess
}

export const findBudgetAccess = async (ownerId: string, viewerId: string, event: H3Event): Promise<BudgetAccess | null> => {
  if (ownerId === viewerId) {
    return 'owner'
  }

  const db = useDatabase(event)
  const [share] = await db
    .select({ access: budgetShare.access })
    .from(budgetShare)
    .where(and(
      eq(budgetShare.ownerId, ownerId),
      eq(budgetShare.sharedWithId, viewerId),
    ))
    .limit(1)

  return share?.access ?? null
}

export const allowsAccessLevel = (access: BudgetAccess | null, level: AccessLevel): boolean => {
  if (access === null) {
    return false
  }
  return level === 'read' || access !== 'read'
}

export const resolveBudget = async (
  event: H3Event,
  currentUser: User,
  username: string | undefined,
  level: AccessLevel,
  forbiddenKey: ErrorKey = ERROR_KEYS.ACCESS_DENIED,
): Promise<ResolvedBudget> => {
  const owner = username ? await findUser(username, event) : currentUser

  if (!owner) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.USER_NOT_FOUND,
    })
  }

  const access = await findBudgetAccess(owner.id, currentUser.id, event)

  if (!access || !allowsAccessLevel(access, level)) {
    throw createError({
      statusCode: 403,
      message: forbiddenKey,
    })
  }

  return {
    owner: { id: owner.id, username: owner.username, mainCurrency: owner.mainCurrency },
    access,
  }
}

export const requireBudgetWriteAccess = async (
  ownerId: string,
  currentUser: User,
  event: H3Event,
  forbiddenKey: ErrorKey,
): Promise<void> => {
  const access = await findBudgetAccess(ownerId, currentUser.id, event)

  if (!allowsAccessLevel(access, 'write')) {
    throw createError({
      statusCode: 403,
      message: forbiddenKey,
    })
  }
}
