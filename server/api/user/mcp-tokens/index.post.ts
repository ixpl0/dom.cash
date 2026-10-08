import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { createMcpToken } from '~~/server/services/mcp/tokens'
import { createMcpTokenSchema } from '~~/shared/schemas/mcp'
import type { CreatedMcpToken } from '~~/shared/types/mcp'

export default defineEventHandler(async (event): Promise<CreatedMcpToken> => {
  const currentUser = await requireAuth(event)
  const payload = await parseBody(event, createMcpTokenSchema)
  return createMcpToken(currentUser.id, payload, new Date(), event)
})
