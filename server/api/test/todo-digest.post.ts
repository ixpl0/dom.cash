import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { todoDigestSettings } from '~~/server/db/schema'
import { getPushSender } from '~~/server/services/push'
import { deliverTodoDigest } from '~~/server/services/todo-digest'
import { requireAuth } from '~~/server/utils/session'
import { isTestMode } from '~~/server/utils/test-mode'
import { parseBody } from '~~/server/utils/validation'

const bodySchema = z.object({
  today: z.iso.date(),
})

export default defineEventHandler(async (event) => {
  const send = isTestMode() ? getPushSender(new Date()) : null

  if (!send) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
    })
  }

  const currentUser = await requireAuth(event)
  const { today } = await parseBody(event, bodySchema)
  const database = useDatabase(event)
  const [settings] = await database
    .select()
    .from(todoDigestSettings)
    .where(eq(todoDigestSettings.userId, currentUser.id))
    .limit(1)

  if (!settings) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No digest settings',
    })
  }

  const { deliveredCount } = await deliverTodoDigest(settings, today, database, send)

  return { deliveredCount }
})
