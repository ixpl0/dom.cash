import { createHash } from 'node:crypto'
import { and, desc, eq, gt, lte } from 'drizzle-orm'
import { createError, getRequestHeader, setResponseHeader, type H3Event } from 'h3'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { oauthAuthorizationCode, oauthClient, oauthGrant, oauthToken, user, type OAuthGrantRow } from '~~/server/db/schema'
import { getIssuer, getProtectedResourceMetadataUrl, isMcpResource, oauthError, type OAuthResponse } from '~~/server/services/mcp/oauth-metadata'
import { generateSessionToken } from '~~/server/utils/auth'
import { hashToken, timingSafeCompareStrings } from '~~/server/utils/crypto'
import { MCP_SCOPES, type McpScope } from '~~/shared/schemas/mcp'
import type { User } from '~~/shared/types'
import type { McpConnection } from '~~/shared/types/mcp'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export const ACCESS_TOKEN_LIFETIME_MS = 60 * 60 * 1000

export const REFRESH_TOKEN_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000

export const LAST_USED_REFRESH_MS = 60 * 60 * 1000

export const ACCESS_TOKEN_PREFIX = 'dcat_'

export const REFRESH_TOKEN_PREFIX = 'dcrt_'

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i

const clientIdSchema = z.string().min(1).max(200)

const resourceSchema = z.string().max(2000).optional()

const authorizationCodeRequestSchema = z.object({
  code: z.string().min(1).max(200),
  redirect_uri: z.string().min(1).max(2000),
  client_id: clientIdSchema,
  code_verifier: z.string().regex(/^[\w.~-]{43,128}$/),
  resource: resourceSchema,
})

const refreshRequestSchema = z.object({
  refresh_token: z.string().min(1).max(200),
  client_id: clientIdSchema,
  resource: resourceSchema,
})

export interface McpCaller {
  grantId: string
  user: User
  scopes: McpScope[]
}

type Database = ReturnType<typeof useDatabase>

const toKnownScopes = (scopes: readonly string[]): McpScope[] =>
  MCP_SCOPES.filter(scope => scopes.includes(scope))

export const createPkceChallenge = (verifier: string): string =>
  createHash('sha256').update(verifier).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const grantTypeSchema = z.object({
  grant_type: z.string().max(100),
})

const readGrantType = (params: unknown): string | undefined => {
  const parsed = grantTypeSchema.safeParse(params)
  return parsed.success ? parsed.data.grant_type : undefined
}

const invalidGrant = (): OAuthResponse => oauthError(400, 'invalid_grant', 'The grant is invalid, expired or revoked')

const invalidTarget = (): OAuthResponse => oauthError(400, 'invalid_target', 'The resource is not the dom.cash MCP server')

const issueTokens = (db: Database, grant: Pick<OAuthGrantRow, 'id' | 'scopes'>, now: Date) => {
  const accessToken = `${ACCESS_TOKEN_PREFIX}${generateSessionToken()}`
  const refreshToken = `${REFRESH_TOKEN_PREFIX}${generateSessionToken()}`

  return {
    statements: [
      db.delete(oauthToken).where(lte(oauthToken.expiresAt, now)),
      db.insert(oauthToken).values([
        { tokenHash: hashToken(accessToken), grantId: grant.id, kind: 'access', expiresAt: new Date(now.getTime() + ACCESS_TOKEN_LIFETIME_MS), createdAt: now },
        { tokenHash: hashToken(refreshToken), grantId: grant.id, kind: 'refresh', expiresAt: new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS), createdAt: now },
      ]),
    ] as const,
    response: {
      status: 200,
      body: {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_LIFETIME_MS / 1000,
        refresh_token: refreshToken,
        scope: toKnownScopes(grant.scopes).join(' '),
      },
    },
  }
}

const exchangeAuthorizationCode = async (params: unknown, issuer: string, now: Date, event: H3Event): Promise<OAuthResponse> => {
  const parsed = authorizationCodeRequestSchema.safeParse(params)

  if (!parsed.success) {
    return oauthError(400, 'invalid_request', 'code, redirect_uri, client_id and code_verifier are required')
  }

  const { code, redirect_uri: redirectUri, client_id: clientId, code_verifier: codeVerifier, resource } = parsed.data
  const db = useDatabase(event)
  const [codeRow] = await db
    .delete(oauthAuthorizationCode)
    .where(eq(oauthAuthorizationCode.codeHash, hashToken(code)))
    .returning()

  const isValidCode = codeRow !== undefined
    && codeRow.expiresAt > now
    && codeRow.clientId === clientId
    && codeRow.redirectUri === redirectUri
    && timingSafeCompareStrings(createPkceChallenge(codeVerifier), codeRow.codeChallenge)

  if (!isValidCode) {
    return invalidGrant()
  }

  if (resource !== undefined && !isMcpResource(resource, issuer)) {
    return invalidTarget()
  }

  const grant: OAuthGrantRow = {
    id: crypto.randomUUID(),
    userId: codeRow.userId,
    clientId: codeRow.clientId,
    scopes: codeRow.scopes,
    createdAt: now,
    lastUsedAt: null,
  }
  const { statements, response } = issueTokens(db, grant, now)

  await db.batch([db.insert(oauthGrant).values(grant), ...statements])

  return response
}

const refreshTokens = async (params: unknown, issuer: string, now: Date, event: H3Event): Promise<OAuthResponse> => {
  const parsed = refreshRequestSchema.safeParse(params)

  if (!parsed.success) {
    return oauthError(400, 'invalid_request', 'refresh_token and client_id are required')
  }

  const { refresh_token: refreshToken, client_id: clientId, resource } = parsed.data

  if (resource !== undefined && !isMcpResource(resource, issuer)) {
    return invalidTarget()
  }

  const db = useDatabase(event)
  const [tokenRow] = await db
    .delete(oauthToken)
    .where(and(eq(oauthToken.tokenHash, hashToken(refreshToken)), eq(oauthToken.kind, 'refresh')))
    .returning()

  if (!tokenRow || tokenRow.expiresAt <= now) {
    return invalidGrant()
  }

  const [grant] = await db
    .select({ id: oauthGrant.id, clientId: oauthGrant.clientId, scopes: oauthGrant.scopes })
    .from(oauthGrant)
    .where(eq(oauthGrant.id, tokenRow.grantId))
    .limit(1)

  if (!grant || grant.clientId !== clientId) {
    return invalidGrant()
  }

  const { statements, response } = issueTokens(db, grant, now)
  await db.batch(statements)

  return response
}

export const exchangeOAuthToken = async (params: unknown, issuer: string, now: Date, event: H3Event): Promise<OAuthResponse> => {
  const grantType = readGrantType(params)

  if (grantType === 'authorization_code') {
    return exchangeAuthorizationCode(params, issuer, now, event)
  }

  if (grantType === 'refresh_token') {
    return refreshTokens(params, issuer, now, event)
  }

  return grantType === undefined
    ? oauthError(400, 'invalid_request', 'grant_type is required')
    : oauthError(400, 'unsupported_grant_type', 'Only authorization_code and refresh_token are supported')
}

const isLastUseStale = (lastUsedAt: Date | null, now: Date): boolean =>
  lastUsedAt === null || now.getTime() - lastUsedAt.getTime() >= LAST_USED_REFRESH_MS

export const findMcpCaller = async (accessToken: string, now: Date, event: H3Event): Promise<McpCaller | null> => {
  if (!accessToken.startsWith(ACCESS_TOKEN_PREFIX)) {
    return null
  }

  const db = useDatabase(event)
  const [record] = await db
    .select({
      grantId: oauthGrant.id,
      scopes: oauthGrant.scopes,
      lastUsedAt: oauthGrant.lastUsedAt,
      userId: user.id,
      username: user.username,
      mainCurrency: user.mainCurrency,
      isAdmin: user.isAdmin,
    })
    .from(oauthToken)
    .innerJoin(oauthGrant, eq(oauthToken.grantId, oauthGrant.id))
    .innerJoin(user, eq(oauthGrant.userId, user.id))
    .where(and(
      eq(oauthToken.tokenHash, hashToken(accessToken)),
      eq(oauthToken.kind, 'access'),
      gt(oauthToken.expiresAt, now),
    ))
    .limit(1)

  if (!record) {
    return null
  }

  if (isLastUseStale(record.lastUsedAt, now)) {
    await db
      .update(oauthGrant)
      .set({ lastUsedAt: now })
      .where(eq(oauthGrant.id, record.grantId))
  }

  return {
    grantId: record.grantId,
    user: {
      id: record.userId,
      username: record.username,
      mainCurrency: record.mainCurrency,
      isAdmin: record.isAdmin,
    },
    scopes: toKnownScopes(record.scopes),
  }
}

export const readBearerToken = (authorization: string | undefined): string | null =>
  authorization?.trim().match(BEARER_PATTERN)?.[1] ?? null

export const requireMcpCaller = async (event: H3Event): Promise<McpCaller> => {
  const accessToken = readBearerToken(getRequestHeader(event, 'authorization'))
  const caller = accessToken ? await findMcpCaller(accessToken, new Date(), event) : null

  if (!caller) {
    const metadataUrl = getProtectedResourceMetadataUrl(getIssuer(event))
    const tokenError = accessToken ? 'error="invalid_token", ' : ''
    setResponseHeader(event, 'WWW-Authenticate', `Bearer ${tokenError}resource_metadata="${metadataUrl}"`)
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  return caller
}

export const listMcpConnections = async (userId: string, event: H3Event): Promise<McpConnection[]> =>
  (await useDatabase(event)
    .select({
      id: oauthGrant.id,
      clientName: oauthClient.name,
      scopes: oauthGrant.scopes,
      createdAt: oauthGrant.createdAt,
      lastUsedAt: oauthGrant.lastUsedAt,
    })
    .from(oauthGrant)
    .innerJoin(oauthClient, eq(oauthGrant.clientId, oauthClient.id))
    .where(eq(oauthGrant.userId, userId))
    .orderBy(desc(oauthGrant.createdAt)))
    .map(({ id, clientName, scopes, createdAt, lastUsedAt }) => ({
      id,
      clientName,
      scopes: toKnownScopes(scopes),
      createdAt: createdAt.toISOString(),
      lastUsedAt: lastUsedAt?.toISOString() ?? null,
    }))

export const deleteMcpConnection = async (userId: string, connectionId: string, event: H3Event): Promise<void> => {
  const deletedGrants = await useDatabase(event)
    .delete(oauthGrant)
    .where(and(eq(oauthGrant.id, connectionId), eq(oauthGrant.userId, userId)))
    .returning({ id: oauthGrant.id })

  if (deletedGrants.length === 0) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.MCP_CONNECTION_NOT_FOUND,
    })
  }
}
