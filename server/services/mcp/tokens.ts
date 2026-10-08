import { and, count, desc, eq } from 'drizzle-orm'
import { createError, getRequestHeader, setResponseHeader, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { mcpToken, user, type McpTokenRow } from '~~/server/db/schema'
import { generateSessionToken } from '~~/server/utils/auth'
import { hashToken } from '~~/server/utils/crypto'
import { MCP_MAX_TOKENS, MCP_SCOPES, type McpScope } from '~~/shared/schemas/mcp'
import type { User } from '~~/shared/types'
import type { CreatedMcpToken, CreateMcpTokenPayload, McpTokenSummary } from '~~/shared/types/mcp'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export const MCP_TOKEN_PREFIX = 'dcmcp_'

export const LAST_USED_REFRESH_MS = 60 * 60 * 1000

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i

export interface McpCaller {
  tokenId: string
  user: User
  scopes: McpScope[]
}

type TokenSummaryRow = Pick<McpTokenRow, 'id' | 'name' | 'scopes' | 'createdAt' | 'lastUsedAt'>

const toKnownScopes = (scopes: readonly string[]): McpScope[] =>
  MCP_SCOPES.filter(scope => scopes.includes(scope))

const toTokenSummary = ({ id, name, scopes, createdAt, lastUsedAt }: TokenSummaryRow): McpTokenSummary => ({
  id,
  name,
  scopes: toKnownScopes(scopes),
  createdAt: createdAt.toISOString(),
  lastUsedAt: lastUsedAt?.toISOString() ?? null,
})

const isLastUseStale = (lastUsedAt: Date | null, now: Date): boolean =>
  lastUsedAt === null || now.getTime() - lastUsedAt.getTime() >= LAST_USED_REFRESH_MS

export const listMcpTokens = async (userId: string, event: H3Event): Promise<McpTokenSummary[]> =>
  (await useDatabase(event)
    .select({
      id: mcpToken.id,
      name: mcpToken.name,
      scopes: mcpToken.scopes,
      createdAt: mcpToken.createdAt,
      lastUsedAt: mcpToken.lastUsedAt,
    })
    .from(mcpToken)
    .where(eq(mcpToken.userId, userId))
    .orderBy(desc(mcpToken.createdAt)))
    .map(toTokenSummary)

export const createMcpToken = async (
  userId: string,
  { name, scopes }: CreateMcpTokenPayload,
  now: Date,
  event: H3Event,
): Promise<CreatedMcpToken> => {
  const db = useDatabase(event)
  const [existing] = await db
    .select({ total: count() })
    .from(mcpToken)
    .where(eq(mcpToken.userId, userId))

  if ((existing?.total ?? 0) >= MCP_MAX_TOKENS) {
    throw createError({
      statusCode: 409,
      message: ERROR_KEYS.MCP_TOO_MANY_TOKENS,
    })
  }

  const secret = `${MCP_TOKEN_PREFIX}${generateSessionToken()}`
  const tokenRow: McpTokenRow = {
    id: crypto.randomUUID(),
    userId,
    name,
    tokenHash: hashToken(secret),
    scopes: toKnownScopes(scopes),
    createdAt: now,
    lastUsedAt: null,
  }

  await db.insert(mcpToken).values(tokenRow)

  return { token: toTokenSummary(tokenRow), secret }
}

export const deleteMcpToken = async (userId: string, tokenId: string, event: H3Event): Promise<void> => {
  const deletedTokens = await useDatabase(event)
    .delete(mcpToken)
    .where(and(eq(mcpToken.id, tokenId), eq(mcpToken.userId, userId)))
    .returning({ id: mcpToken.id })

  if (deletedTokens.length === 0) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.MCP_TOKEN_NOT_FOUND,
    })
  }
}

export const findMcpCaller = async (secret: string, now: Date, event: H3Event): Promise<McpCaller | null> => {
  if (!secret.startsWith(MCP_TOKEN_PREFIX)) {
    return null
  }

  const db = useDatabase(event)
  const [record] = await db
    .select({
      tokenId: mcpToken.id,
      scopes: mcpToken.scopes,
      lastUsedAt: mcpToken.lastUsedAt,
      userId: user.id,
      username: user.username,
      mainCurrency: user.mainCurrency,
      isAdmin: user.isAdmin,
    })
    .from(mcpToken)
    .innerJoin(user, eq(mcpToken.userId, user.id))
    .where(eq(mcpToken.tokenHash, hashToken(secret)))
    .limit(1)

  if (!record) {
    return null
  }

  if (isLastUseStale(record.lastUsedAt, now)) {
    await db
      .update(mcpToken)
      .set({ lastUsedAt: now })
      .where(eq(mcpToken.id, record.tokenId))
  }

  return {
    tokenId: record.tokenId,
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
  const secret = readBearerToken(getRequestHeader(event, 'authorization'))
  const caller = secret ? await findMcpCaller(secret, new Date(), event) : null

  if (!caller) {
    setResponseHeader(event, 'WWW-Authenticate', secret ? 'Bearer realm="dom.cash", error="invalid_token"' : 'Bearer realm="dom.cash"')
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  return caller
}
