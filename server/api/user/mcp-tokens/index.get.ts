import { requireAuth } from '~~/server/utils/session'
import { listMcpTokens } from '~~/server/services/mcp/tokens'
import type { McpTokensData } from '~~/shared/types/mcp'

export default defineEventHandler(async (event): Promise<McpTokensData> => {
  const currentUser = await requireAuth(event)
  return { tokens: await listMcpTokens(currentUser.id, event) }
})
