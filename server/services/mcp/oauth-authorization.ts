import { lte } from 'drizzle-orm'
import { createError, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { oauthAuthorizationCode, type OAuthClientRow } from '~~/server/db/schema'
import { findOAuthClient } from '~~/server/services/mcp/oauth-clients'
import { isMcpResource } from '~~/server/services/mcp/oauth-metadata'
import { generateSessionToken } from '~~/server/utils/auth'
import { hashToken } from '~~/server/utils/crypto'
import { MCP_SCOPES, type McpScope } from '~~/shared/schemas/mcp'
import type { User } from '~~/shared/types'
import type { OAuthAuthorizationDetails, OAuthAuthorizationRequest, OAuthDecisionPayload, OAuthDecisionResult } from '~~/shared/types/mcp'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export const AUTHORIZATION_CODE_LIFETIME_MS = 10 * 60 * 1000

interface ResolvedAuthorization {
  client: OAuthClientRow
  scopes: McpScope[]
}

export const parseRequestedScopes = (scope: string | undefined): McpScope[] => {
  const requested = (scope ?? '').split(/\s+/)
  const knownScopes = MCP_SCOPES.filter(knownScope => requested.includes(knownScope))
  return knownScopes.length > 0 ? knownScopes : [...MCP_SCOPES]
}

const buildRedirectUrl = (redirectUri: string, params: Record<string, string | undefined>): string => {
  const definedParams = Object.entries(params).filter((param): param is [string, string] => param[1] !== undefined)
  return `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}${new URLSearchParams(definedParams).toString()}`
}

const refuseRequest = () => createError({
  statusCode: 400,
  message: ERROR_KEYS.OAUTH_INVALID_REQUEST,
})

export const resolveAuthorizationRequest = async (
  request: OAuthAuthorizationRequest,
  issuer: string,
  event: H3Event,
): Promise<ResolvedAuthorization> => {
  const client = await findOAuthClient(request.client_id, event)

  if (!client || !client.redirectUris.includes(request.redirect_uri)) {
    throw refuseRequest()
  }

  if (request.resource !== undefined && !isMcpResource(request.resource, issuer)) {
    throw refuseRequest()
  }

  return { client, scopes: parseRequestedScopes(request.scope) }
}

export const describeAuthorizationRequest = async (
  request: OAuthAuthorizationRequest,
  issuer: string,
  event: H3Event,
): Promise<OAuthAuthorizationDetails> => {
  const { client, scopes } = await resolveAuthorizationRequest(request, issuer, event)

  return {
    clientName: client.name,
    redirectHost: new URL(request.redirect_uri).host,
    scopes,
  }
}

export const decideAuthorization = async (
  user: User,
  { request, grantedScopes, isApproved }: OAuthDecisionPayload,
  issuer: string,
  now: Date,
  event: H3Event,
): Promise<OAuthDecisionResult> => {
  const { client, scopes } = await resolveAuthorizationRequest(request, issuer, event)

  if (!isApproved) {
    return { redirectUrl: buildRedirectUrl(request.redirect_uri, { error: 'access_denied', state: request.state }) }
  }

  const approvedScopes = scopes.filter(scope => grantedScopes.includes(scope))

  if (approvedScopes.length === 0) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.OAUTH_NO_SCOPES,
    })
  }

  const code = generateSessionToken()
  const db = useDatabase(event)
  await db.batch([
    db.delete(oauthAuthorizationCode).where(lte(oauthAuthorizationCode.expiresAt, now)),
    db.insert(oauthAuthorizationCode).values({
      codeHash: hashToken(code),
      clientId: client.id,
      userId: user.id,
      redirectUri: request.redirect_uri,
      codeChallenge: request.code_challenge,
      scopes: approvedScopes,
      resource: request.resource ?? null,
      expiresAt: new Date(now.getTime() + AUTHORIZATION_CODE_LIFETIME_MS),
      createdAt: now,
    }),
  ])

  return { redirectUrl: buildRedirectUrl(request.redirect_uri, { code, state: request.state }) }
}
