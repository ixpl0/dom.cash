import { useDatabase } from '~~/server/db'
import { sendTestPush } from '~~/server/services/push'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { pushEndpointBodySchema } from '~~/shared/schemas/push'
import type { PushTestResult } from '~~/shared/types/push'

export default defineEventHandler(async (event): Promise<PushTestResult> => {
  const currentUser = await requireAuth(event)
  const { endpoint } = await parseBody(event, pushEndpointBodySchema)
  return sendTestPush(currentUser.id, endpoint, useDatabase(event), new Date())
})
