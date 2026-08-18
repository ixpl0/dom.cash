import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/session'
import { useDatabase } from '~~/server/db'
import { user } from '~~/server/db/schema'
import { setImpersonationCookie } from '~~/server/utils/impersonation'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const bodySchema = z.object({
  userId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  if (!currentUser.isAdmin) {
    throw createError({ statusCode: 403, message: ERROR_KEYS.FORBIDDEN })
  }

  const parsed = bodySchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: ERROR_KEYS.VALIDATION_FAILED })
  }

  const { userId } = parsed.data

  if (userId === currentUser.id) {
    throw createError({ statusCode: 400, message: ERROR_KEYS.CANNOT_IMPERSONATE_YOURSELF })
  }

  const db = useDatabase(event)
  const [targetUser] = await db
    .select({
      id: user.id,
      username: user.username,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!targetUser) {
    throw createError({ statusCode: 404, message: ERROR_KEYS.USER_NOT_FOUND })
  }

  setImpersonationCookie(event, targetUser.id)

  return { success: true, username: targetUser.username }
})
