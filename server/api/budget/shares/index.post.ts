import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { budgetShare } from '~~/server/db/schema'
import type { NewBudgetShare } from '~~/server/db/schema'
import { findUser } from '~~/server/utils/auth'
import { requireAuth } from '~~/server/utils/session'
import { accessSchema, usernameSchema } from '~~/shared/schemas/common'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { parseBody } from '~~/server/utils/validation'

const createShareSchema = z.object({
  username: usernameSchema,
  access: accessSchema,
})

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  const currentUser = await requireAuth(event)

  const { username, access } = await parseBody(event, createShareSchema)

  const targetUser = await findUser(username, event)

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.USER_NOT_FOUND,
    })
  }

  if (targetUser.id === currentUser.id) {
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
      eq(budgetShare.sharedWithId, targetUser.id),
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
    sharedWithId: targetUser.id,
    access,
    createdAt: new Date(),
  }

  await db.insert(budgetShare).values(newShare)

  return {
    id: newShare.id,
    username: targetUser.username,
    access,
    createdAt: newShare.createdAt,
  }
})
