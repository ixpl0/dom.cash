import { useDatabase } from '~~/server/db'
import { removePushDevice } from '~~/server/services/push'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { pushEndpointBodySchema } from '~~/shared/schemas/push'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const { endpoint } = await parseBody(event, pushEndpointBodySchema)

  await removePushDevice(currentUser.id, endpoint, useDatabase(event))

  return { success: true }
})
