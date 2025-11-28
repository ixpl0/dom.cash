import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import type { NewBudgetShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { accessSchema } from '~~/shared/schemas/common'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const createShareSchema = z.object({
  username: z.string().min(1),
  access: accessSchema,
})

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
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
      message: ERROR_KEYS.USER_NOT_FOUND,
    })
  }

  const targetUserData = targetUser[0]
  if (!targetUserData) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.USER_NOT_FOUND,
    })
  }

  if (targetUserData.id === currentUser.id) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.CANNOT_SHARE_WITH_YOURSELF,
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
      message: ERROR_KEYS.ALREADY_SHARED,
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
