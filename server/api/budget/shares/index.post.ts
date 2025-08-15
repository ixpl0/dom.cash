import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import type { NewBudgetShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'

const createShareSchema = z.object({
  username: z.string().min(1),
  access: z.enum(['read', 'write']),
})

export default defineEventHandler(async (event) => {
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const body = await readBody(event)
  const { username, access } = createShareSchema.parse(body)

  const targetUser = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  if (targetUser.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found',
    })
  }

  const targetUserData = targetUser[0]
  if (!targetUserData) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found',
    })
  }

  if (targetUserData.id === currentUser.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot share with yourself',
    })
  }

  const existingShare = await db
    .select()
    .from(budgetShare)
    .where(and(
      eq(budgetShare.ownerId, currentUser.id),
      eq(budgetShare.sharedWithId, targetUserData.id),
    ))
    .limit(1)

  if (existingShare.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Budget is already shared with this user',
    })
  }

  const newShare: NewBudgetShare = {
    id: crypto.randomUUID(),
    ownerId: currentUser.id,
    sharedWithId: targetUserData.id,
    access,
    createdAt: new Date(),
  }

  await db.insert(budgetShare).values(newShare)

  return {
    id: newShare.id,
    username,
    access,
    createdAt: newShare.createdAt,
  }
})
