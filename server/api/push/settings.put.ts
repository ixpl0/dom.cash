import { useDatabase } from '~~/server/db'
import { updateTodoDigestSettings } from '~~/server/services/push'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { todoDigestSettingsSchema } from '~~/shared/schemas/push'
import type { TodoDigestSettings } from '~~/shared/types/push'

export default defineEventHandler(async (event): Promise<TodoDigestSettings> => {
  const currentUser = await requireAuth(event)
  const settings = await parseBody(event, todoDigestSettingsSchema)
  return updateTodoDigestSettings(currentUser.id, settings, useDatabase(event))
})
