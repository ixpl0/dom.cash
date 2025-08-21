import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import type { BudgetShareAccess } from '~~/server/db/schema'

export interface CreateShareParams {
  ownerId: string
  sharedWithUsername: string
  access: BudgetShareAccess
}

export interface UpdateShareParams {
  access: BudgetShareAccess
}

export const findUserByUsername = async (username: string, event: H3Event) => {
  const db = useDatabase(event)
  const users = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  return users[0] || null
}

export const getExistingShare = async (ownerId: string, sharedWithId: string, event: H3Event) => {
  const db = useDatabase(event)
  const shares = await db
    .select()
    .from(budgetShare)
    .where(and(
      eq(budgetShare.ownerId, ownerId),
      eq(budgetShare.sharedWithId, sharedWithId),
    ))
    .limit(1)

  return shares[0] || null
}

export const getMyShares = async (userId: string, event: H3Event) => {
  const db = useDatabase(event)
  return await db
    .select({
      id: budgetShare.id,
      ownerId: budgetShare.ownerId,
      sharedWithId: budgetShare.sharedWithId,
      access: budgetShare.access,
      createdAt: budgetShare.createdAt,
    })
    .from(budgetShare)
    .where(eq(budgetShare.ownerId, userId))
}

export const getUserShares = async (userId: string, event: H3Event) => {
  const myShares = await getMyShares(userId, event)
  const sharedWithMe = await getSharedWithUser(userId, event)

  return {
    myShares,
    sharedWithMe,
  }
}

export const getSharedWithUser = async (userId: string, event: H3Event) => {
  const db = useDatabase(event)
  return await db
    .select({
      id: budgetShare.id,
      ownerId: budgetShare.ownerId,
      sharedWithId: budgetShare.sharedWithId,
      access: budgetShare.access,
      createdAt: budgetShare.createdAt,
    })
    .from(budgetShare)
    .where(eq(budgetShare.sharedWithId, userId))
}

export const getShareById = async (shareId: string, event: H3Event) => {
  const db = useDatabase(event)
  const shares = await db
    .select({
      id: budgetShare.id,
      ownerId: budgetShare.ownerId,
      sharedWithId: budgetShare.sharedWithId,
      access: budgetShare.access,
      createdAt: budgetShare.createdAt,
      sharedWith: {
        id: user.id,
        username: user.username,
      },
    })
    .from(budgetShare)
    .innerJoin(user, eq(budgetShare.sharedWithId, user.id))
    .where(eq(budgetShare.id, shareId))
    .limit(1)

  return shares[0] || null
}

export const createShare = async (params: CreateShareParams, event: H3Event) => {
  const sharedWithUser = await findUserByUsername(params.sharedWithUsername, event)
  if (!sharedWithUser) {
    throw new Error('User not found')
  }

  if (sharedWithUser.id === params.ownerId) {
    throw new Error('Cannot share with yourself')
  }

  const existingShare = await getExistingShare(params.ownerId, sharedWithUser.id, event)
  if (existingShare) {
    throw new Error('Budget already shared with this user')
  }

  const db = useDatabase(event)
  const newShare = await db
    .insert(budgetShare)
    .values({
      id: crypto.randomUUID(),
      ownerId: params.ownerId,
      sharedWithId: sharedWithUser.id,
      access: params.access,
      createdAt: new Date(),
    })
    .returning()

  return newShare[0]
}

export const updateShare = async (shareId: string, params: UpdateShareParams, event: H3Event) => {
  const db = useDatabase(event)
  const updatedShare = await db
    .update(budgetShare)
    .set({
      access: params.access,
    })
    .where(eq(budgetShare.id, shareId))
    .returning()

  return updatedShare[0]
}

export const deleteShare = async (shareId: string, event: H3Event) => {
  const db = useDatabase(event)
  const deletedShare = await db
    .delete(budgetShare)
    .where(eq(budgetShare.id, shareId))
    .returning()

  return deletedShare[0]
}

export const checkShareOwnership = async (shareId: string, userId: string, event: H3Event): Promise<boolean> => {
  const share = await getShareById(shareId, event)
  return share?.ownerId === userId
}
