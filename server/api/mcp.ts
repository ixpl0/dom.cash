import { createError, readBody, sendNoContent, setResponseHeader, setResponseStatus } from 'h3'
import { recordUserActivity } from '~~/server/services/auth/users'
import { handleMcpMessage } from '~~/server/services/mcp/protocol'
import { requireMcpCaller } from '~~/server/services/mcp/tokens'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    setResponseHeader(event, 'Allow', 'POST')
    throw createError({
      statusCode: 405,
      message: ERROR_KEYS.METHOD_NOT_ALLOWED,
    })
  }

  const { user, scopes } = await requireMcpCaller(event)
  const reply = await handleMcpMessage(await readBody(event), { event, user, scopes })

  recordUserActivity(user, event)

  if (reply.status === 202) {
    return sendNoContent(event, 202)
  }

  setResponseStatus(event, reply.status)
  return reply.body
})
