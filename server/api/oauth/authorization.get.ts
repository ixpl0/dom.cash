import { requireAuth } from '~~/server/utils/session'
import { parseQuery } from '~~/server/utils/validation'
import { describeAuthorizationRequest } from '~~/server/services/mcp/oauth-authorization'
import { getIssuer } from '~~/server/services/mcp/oauth-metadata'
import { oauthAuthorizationRequestSchema } from '~~/shared/schemas/mcp'
import type { OAuthAuthorizationDetails } from '~~/shared/types/mcp'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<OAuthAuthorizationDetails> => {
  await requireAuth(event)
  const request = parseQuery(event, oauthAuthorizationRequestSchema, ERROR_KEYS.OAUTH_INVALID_REQUEST)
  return describeAuthorizationRequest(request, getIssuer(event), event)
})
