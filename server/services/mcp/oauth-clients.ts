import { and, eq, lt, notInArray } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { oauthClient, oauthGrant, type OAuthClientRow } from '~~/server/db/schema'
import { OAUTH_GRANT_TYPES, oauthError, type OAuthResponse } from '~~/server/services/mcp/oauth-metadata'

export const OAUTH_CALLBACK_URLS: readonly string[] = ['https://claude.ai/api/mcp/auth_callback']

export const UNUSED_CLIENT_LIFETIME_MS = 24 * 60 * 60 * 1000

const registrationSchema = z.object({
  redirect_uris: z.array(z.string().max(2000)).min(1).max(10),
  client_name: z.string().trim().min(1).max(100).optional(),
  token_endpoint_auth_method: z.string().max(100).optional(),
  grant_types: z.array(z.string().max(100)).max(10).optional(),
  response_types: z.array(z.string().max(100)).max(10).optional(),
})

const readHost = (url: string): string => new URL(url).host

export const registerOAuthClient = async (metadata: unknown, now: Date, event: H3Event): Promise<OAuthResponse> => {
  const parsed = registrationSchema.safeParse(metadata)

  if (!parsed.success) {
    return oauthError(400, 'invalid_client_metadata', 'The client metadata is not valid')
  }

  const { redirect_uris: redirectUris, client_name: clientName, token_endpoint_auth_method: authMethod, grant_types: grantTypes, response_types: responseTypes } = parsed.data

  if (!redirectUris.every(uri => OAUTH_CALLBACK_URLS.includes(uri))) {
    return oauthError(400, 'invalid_redirect_uri', 'Only Claude can connect to dom.cash')
  }

  if ((authMethod && authMethod !== 'none')
    || (grantTypes && !grantTypes.every(grantType => OAUTH_GRANT_TYPES.includes(grantType)))
    || (responseTypes && !responseTypes.every(responseType => responseType === 'code'))) {
    return oauthError(400, 'invalid_client_metadata', 'Only public clients with the authorization code flow are supported')
  }

  const client: OAuthClientRow = {
    id: crypto.randomUUID(),
    name: clientName ?? readHost(redirectUris[0] ?? ''),
    redirectUris: [...new Set(redirectUris)],
    createdAt: now,
  }

  const db = useDatabase(event)
  await db.batch([
    db.delete(oauthClient).where(and(
      lt(oauthClient.createdAt, new Date(now.getTime() - UNUSED_CLIENT_LIFETIME_MS)),
      notInArray(oauthClient.id, db.select({ clientId: oauthGrant.clientId }).from(oauthGrant)),
    )),
    db.insert(oauthClient).values(client),
  ])

  return {
    status: 201,
    body: {
      client_id: client.id,
      client_id_issued_at: Math.floor(now.getTime() / 1000),
      client_name: client.name,
      redirect_uris: client.redirectUris,
      grant_types: [...OAUTH_GRANT_TYPES],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    },
  }
}

export const findOAuthClient = async (clientId: string, event: H3Event): Promise<OAuthClientRow | undefined> => {
  const [client] = await useDatabase(event)
    .select()
    .from(oauthClient)
    .where(eq(oauthClient.id, clientId))
    .limit(1)

  return client
}
