import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { decideAuthorization } from '~~/server/services/mcp/oauth-authorization'
import { getIssuer } from '~~/server/services/mcp/oauth-metadata'
import { oauthDecisionSchema } from '~~/shared/schemas/mcp'
import type { OAuthDecisionResult } from '~~/shared/types/mcp'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<OAuthDecisionResult> => {
  const currentUser = await requireAuth(event)
  const decision = await parseBody(event, oauthDecisionSchema, ERROR_KEYS.OAUTH_INVALID_REQUEST)
  return decideAuthorization(currentUser, decision, getIssuer(event), new Date(), event)
})
