import { requireAuth } from '~~/server/utils/session'
import { listMcpConnections } from '~~/server/services/mcp/oauth-tokens'
import type { McpConnectionsData } from '~~/shared/types/mcp'

export default defineEventHandler(async (event): Promise<McpConnectionsData> => {
  const currentUser = await requireAuth(event)
  return { connections: await listMcpConnections(currentUser.id, event) }
})
