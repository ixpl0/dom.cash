import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { deleteMcpConnection } from '~~/server/services/mcp/oauth-tokens'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const connectionId = requireRouterParam(event, 'id', ERROR_KEYS.MCP_CONNECTION_ID_REQUIRED)
  await deleteMcpConnection(currentUser.id, connectionId, event)
  return { success: true }
})
