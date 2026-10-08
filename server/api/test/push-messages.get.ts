import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { isTestMode } from '~~/server/utils/test-mode'
import { readTestPushes } from '~~/server/utils/test-push-recorder'
import { parseQuery } from '~~/server/utils/validation'
import { PUSH_ENDPOINT_MAX_LENGTH } from '~~/shared/schemas/push'

const querySchema = z.object({
  endpoint: z.string().max(PUSH_ENDPOINT_MAX_LENGTH),
})

export default defineEventHandler(async (event) => {
  if (!isTestMode()) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
    })
  }

  await requireAuth(event)
  const { endpoint } = parseQuery(event, querySchema)

  return readTestPushes(endpoint)
})
