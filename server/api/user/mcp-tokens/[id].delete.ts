import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { deleteMcpToken } from '~~/server/services/mcp/tokens'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const tokenId = requireRouterParam(event, 'id', ERROR_KEYS.MCP_TOKEN_ID_REQUIRED)
  await deleteMcpToken(currentUser.id, tokenId, event)
  return { success: true }
})
