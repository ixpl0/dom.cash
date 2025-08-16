import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/db'
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

export const findUserByUsername = async (username: string) => {
  const users = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  return users[0] || null
}

export const getExistingShare = async (ownerId: string, sharedWithId: string) => {
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

export const getMyShares = async (userId: string) => {
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

export const getUserShares = async (userId: string) => {
  const myShares = await getMyShares(userId)
  const sharedWithMe = await getSharedWithUser(userId)

  return {
    myShares,
    sharedWithMe,
  }
}

export const getSharedWithUser = async (userId: string) => {
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

export const getShareById = async (shareId: string) => {
  const shares = await db
    .select()
    .from(budgetShare)
    .where(eq(budgetShare.id, shareId))
    .limit(1)

  return shares[0] || null
}

export const createShare = async (params: CreateShareParams) => {
  const sharedWithUser = await findUserByUsername(params.sharedWithUsername)
  if (!sharedWithUser) {
    throw new Error('User not found')
  }

  if (sharedWithUser.id === params.ownerId) {
    throw new Error('Cannot share with yourself')
  }

  const existingShare = await getExistingShare(params.ownerId, sharedWithUser.id)
  if (existingShare) {
    throw new Error('Budget already shared with this user')
  }

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

export const updateShare = async (shareId: string, params: UpdateShareParams) => {
  const updatedShare = await db
    .update(budgetShare)
    .set({
      access: params.access,
    })
    .where(eq(budgetShare.id, shareId))
    .returning()

  return updatedShare[0]
}

export const deleteShare = async (shareId: string) => {
  const deletedShare = await db
    .delete(budgetShare)
    .where(eq(budgetShare.id, shareId))
    .returning()

  return deletedShare[0]
}

export const checkShareOwnership = async (shareId: string, userId: string): Promise<boolean> => {
  const share = await getShareById(shareId)
  return share?.ownerId === userId
}
