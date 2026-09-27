import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { budgetShare } from '~~/server/db/schema'
import { findUser } from '~~/server/utils/auth'
import { requireAuth } from '~~/server/utils/session'
import { accessSchema, usernameSchema } from '~~/shared/schemas/common'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
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

  const [createdShare] = await db
    .insert(budgetShare)
    .values({
      id: crypto.randomUUID(),
      ownerId: currentUser.id,
      sharedWithId: targetUser.id,
      access,
      createdAt: new Date(),
    })
    .onConflictDoNothing({ target: [budgetShare.ownerId, budgetShare.sharedWithId] })
    .returning({ id: budgetShare.id, createdAt: budgetShare.createdAt })

  if (!createdShare) {
    throw createError({
      statusCode: 409,
      message: ERROR_KEYS.ALREADY_SHARED,
    })
  }

  return {
    id: createdShare.id,
    username: targetUser.username,
    access,
    createdAt: createdShare.createdAt,
  }
})
