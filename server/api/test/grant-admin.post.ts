import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { user } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'
import { isTestMode } from '~~/server/utils/test-mode'

export default defineEventHandler(async (event) => {
  if (!isTestMode()) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
    })
  }

  const currentUser = await requireAuth(event)

  await useDatabase(event)
    .update(user)
    .set({ isAdmin: true })
    .where(eq(user.id, currentUser.id))

  return { message: 'The user is an admin now' }
})
