import assert from 'node:assert/strict'
import { test } from 'node:test'
import { eq } from 'drizzle-orm'
import { useDatabase } from '../../server/db'
import { user } from '../../server/db/schema'
import { AUTHORIZATION_CODE_LIFETIME_MS, decideAuthorization, describeAuthorizationRequest, parseRequestedScopes } from '../../server/services/mcp/oauth-authorization'
import { findOAuthClient, registerOAuthClient, UNUSED_CLIENT_LIFETIME_MS } from '../../server/services/mcp/oauth-clients'
import { buildAuthorizationServerMetadata, buildProtectedResourceMetadata } from '../../server/services/mcp/oauth-metadata'
import {
  ACCESS_TOKEN_LIFETIME_MS,
  createPkceChallenge,
  deleteMcpConnection,
  exchangeOAuthToken,
  findMcpCaller,
  LAST_USED_REFRESH_MS,
  listMcpConnections,
  readBearerToken,
  REFRESH_TOKEN_LIFETIME_MS,
} from '../../server/services/mcp/oauth-tokens'
import type { McpScope } from '../../shared/schemas/mcp'
import type { User } from '../../shared/types'
import type { OAuthAuthorizationRequest } from '../../shared/types/mcp'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'
import { createTestDatabase, type TestDatabase } from './helpers/test-database'

const NOW = new Date('2026-10-09T12:00:00Z')
const ISSUER = 'https://domcash.ixplo.ai'
const MCP_URL = `${ISSUER}/api/mcp`
const CALLBACK = 'https://claude.ai/api/mcp/auth_callback'
const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

const toUser = (id: string): User => ({ id, username: `${id}@example.com`, mainCurrency: 'USD', isAdmin: false })

const owner = toUser('owner')
const friend = toUser('friend')

const later = (milliseconds: number): Date => new Date(NOW.getTime() + milliseconds)

const createDatabaseWithUsers = async (): Promise<TestDatabase> => {
  const database = createTestDatabase()
  await useDatabase(database.event).insert(user).values([owner, friend].map(({ id, username }) => ({
    id,
    username,
    passwordHash: 'hash',
    mainCurrency: 'USD',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  })))
  return database
}

const registerClient = async (database: TestDatabase, now = NOW): Promise<string> => {
  const { status, body } = await registerOAuthClient({
    redirect_uris: [CALLBACK],
    client_name: 'Claude',
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  }, now, database.event)
  assert.equal(status, 201)
  return String(body.client_id)
}

const toAuthorizationRequest = (clientId: string, changes: Partial<OAuthAuthorizationRequest> = {}): OAuthAuthorizationRequest => ({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: CALLBACK,
  code_challenge: CHALLENGE,
  code_challenge_method: 'S256',
  state: 'state-1',
  scope: 'budget todo docs',
  resource: MCP_URL,
  ...changes,
})

const authorize = async (database: TestDatabase, clientId: string, grantedScopes: McpScope[] = ['budget', 'todo'], viewer = owner): Promise<string> => {
  const { redirectUrl } = await decideAuthorization(viewer, { request: toAuthorizationRequest(clientId), grantedScopes, isApproved: true }, ISSUER, NOW, database.event)
  const url = new URL(redirectUrl)
  assert.equal(`${url.origin}${url.pathname}`, CALLBACK)
  assert.equal(url.searchParams.get('state'), 'state-1')
  return url.searchParams.get('code') ?? ''
}

const exchangeCode = (database: TestDatabase, clientId: string, code: string, changes: Record<string, string> = {}, now = NOW) =>
  exchangeOAuthToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: CALLBACK,
    client_id: clientId,
    code_verifier: VERIFIER,
    resource: MCP_URL,
    ...changes,
  }, ISSUER, now, database.event)

const refresh = (database: TestDatabase, clientId: string, refreshToken: string, now = NOW) =>
  exchangeOAuthToken({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, resource: MCP_URL }, ISSUER, now, database.event)

const connect = async (database: TestDatabase, grantedScopes: McpScope[] = ['budget', 'todo'], viewer = owner) => {
  const clientId = await registerClient(database)
  const { status, body } = await exchangeCode(database, clientId, await authorize(database, clientId, grantedScopes, viewer))
  assert.equal(status, 200)
  return { clientId, accessToken: String(body.access_token), refreshToken: String(body.refresh_token) }
}

const invalidGrant = { status: 400, body: { error: 'invalid_grant', error_description: 'The grant is invalid, expired or revoked' } }

const countRows = (database: TestDatabase, table: string): number =>
  Number(database.sqlite.prepare(`SELECT count(*) AS total FROM ${table}`).get()?.total)

test('createPkceChallenge reproduces the S256 example of RFC 7636', () => {
  assert.equal(createPkceChallenge(VERIFIER), CHALLENGE)
})

test('readBearerToken takes the token from a Bearer authorization header only', () => {
  assert.equal(readBearerToken('Bearer dcat_abc'), 'dcat_abc')
  assert.equal(readBearerToken('  bearer   dcat_abc  '), 'dcat_abc')
  assert.equal(readBearerToken('Basic dcat_abc'), null)
  assert.equal(readBearerToken('Bearer'), null)
  assert.equal(readBearerToken(undefined), null)
})

test('the metadata documents send Claude to the authorization server and its registration endpoint', () => {
  assert.deepEqual(buildProtectedResourceMetadata(ISSUER), {
    resource: MCP_URL,
    authorization_servers: [ISSUER],
    scopes_supported: ['budget', 'todo', 'docs'],
    bearer_methods_supported: ['header'],
    resource_name: 'dom.cash',
  })
  assert.deepEqual(buildAuthorizationServerMetadata(ISSUER), {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/oauth/authorize`,
    token_endpoint: `${ISSUER}/oauth/token`,
    registration_endpoint: `${ISSUER}/oauth/register`,
    scopes_supported: ['budget', 'todo', 'docs'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
  })
})

test('registerOAuthClient registers Claude as a public client', async () => {
  const database = await createDatabaseWithUsers()

  const { status, body } = await registerOAuthClient({ redirect_uris: [CALLBACK, CALLBACK], client_name: 'Claude' }, NOW, database.event)

  assert.equal(status, 201)
  assert.deepEqual(body, {
    client_id: body.client_id,
    client_id_issued_at: Math.floor(NOW.getTime() / 1000),
    client_name: 'Claude',
    redirect_uris: [CALLBACK],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  })
  assert.deepEqual(await findOAuthClient(String(body.client_id), database.event), {
    id: body.client_id,
    name: 'Claude',
    redirectUris: [CALLBACK],
    createdAt: NOW,
  })
})

test('registerOAuthClient refuses other redirect addresses and confidential clients', async () => {
  const database = await createDatabaseWithUsers()
  const register = async (metadata: Record<string, unknown>) =>
    (await registerOAuthClient(metadata, NOW, database.event)).body.error

  assert.equal(await register({ redirect_uris: ['https://example.com/callback'] }), 'invalid_redirect_uri')
  assert.equal(await register({ redirect_uris: [CALLBACK, 'http://localhost:3118/callback'] }), 'invalid_redirect_uri')
  assert.equal(await register({ redirect_uris: [CALLBACK], token_endpoint_auth_method: 'client_secret_basic' }), 'invalid_client_metadata')
  assert.equal(await register({ redirect_uris: [CALLBACK], grant_types: ['client_credentials'] }), 'invalid_client_metadata')
  assert.equal(await register({ redirect_uris: [] }), 'invalid_client_metadata')
  assert.equal(await register({ client_name: 'Claude' }), 'invalid_client_metadata')
  assert.equal(countRows(database, 'oauth_client'), 0)
})

test('registerOAuthClient deletes the clients that stayed unconnected for a day', async () => {
  const database = await createDatabaseWithUsers()
  const oldTime = new Date(NOW.getTime() - UNUSED_CLIENT_LIFETIME_MS - 1)
  const unusedClientId = await registerClient(database, oldTime)
  const connectedClientId = await registerClient(database, oldTime)
  await exchangeCode(database, connectedClientId, await authorize(database, connectedClientId))
  const recentClientId = await registerClient(database, new Date(NOW.getTime() - UNUSED_CLIENT_LIFETIME_MS + 1))

  const newClientId = await registerClient(database)

  assert.equal(await findOAuthClient(unusedClientId, database.event), undefined)
  assert.notEqual(await findOAuthClient(connectedClientId, database.event), undefined)
  assert.notEqual(await findOAuthClient(recentClientId, database.event), undefined)
  assert.notEqual(await findOAuthClient(newClientId, database.event), undefined)
})

test('parseRequestedScopes keeps the known scopes in a fixed order', () => {
  assert.deepEqual(parseRequestedScopes('docs budget offline_access'), ['budget', 'docs'])
  assert.deepEqual(parseRequestedScopes(undefined), ['budget', 'todo', 'docs'])
  assert.deepEqual(parseRequestedScopes('offline_access'), ['budget', 'todo', 'docs'])
})

test('describeAuthorizationRequest names the client, the host it returns to and the requested scopes', async () => {
  const database = await createDatabaseWithUsers()
  const clientId = await registerClient(database)

  assert.deepEqual(await describeAuthorizationRequest(toAuthorizationRequest(clientId, { scope: 'todo budget' }), ISSUER, database.event), {
    clientName: 'Claude',
    redirectHost: 'claude.ai',
    scopes: ['budget', 'todo'],
  })
  assert.equal((await describeAuthorizationRequest(toAuthorizationRequest(clientId, { resource: 'https://DOMCASH.ixplo.ai/api/mcp/' }), ISSUER, database.event)).clientName, 'Claude')
})

test('the authorization request is refused for an unknown client, another redirect address or another resource', async () => {
  const database = await createDatabaseWithUsers()
  const clientId = await registerClient(database)
  const refusal = { statusCode: 400, message: ERROR_KEYS.OAUTH_INVALID_REQUEST }

  await assert.rejects(describeAuthorizationRequest(toAuthorizationRequest('unknown'), ISSUER, database.event), refusal)
  await assert.rejects(describeAuthorizationRequest(toAuthorizationRequest(clientId, { redirect_uri: 'https://claude.ai/other' }), ISSUER, database.event), refusal)
  await assert.rejects(describeAuthorizationRequest(toAuthorizationRequest(clientId, { resource: 'https://example.com/api/mcp' }), ISSUER, database.event), refusal)
  await assert.rejects(
    decideAuthorization(owner, { request: toAuthorizationRequest(clientId, { redirect_uri: 'https://example.com/callback' }), grantedScopes: ['budget'], isApproved: false }, ISSUER, NOW, database.event),
    refusal,
  )
})

test('a denied authorization returns the error to Claude and creates no code', async () => {
  const database = await createDatabaseWithUsers()
  const clientId = await registerClient(database)

  const { redirectUrl } = await decideAuthorization(owner, { request: toAuthorizationRequest(clientId), grantedScopes: [], isApproved: false }, ISSUER, NOW, database.event)

  assert.equal(redirectUrl, `${CALLBACK}?error=access_denied&state=state-1`)
  assert.equal(countRows(database, 'oauth_authorization_code'), 0)
})

test('an approval needs at least one requested scope', async () => {
  const database = await createDatabaseWithUsers()
  const clientId = await registerClient(database)
  const request = toAuthorizationRequest(clientId, { scope: 'budget' })

  await assert.rejects(decideAuthorization(owner, { request, grantedScopes: ['docs'], isApproved: true }, ISSUER, NOW, database.event), {
    statusCode: 400,
    message: ERROR_KEYS.OAUTH_NO_SCOPES,
  })
  assert.equal(countRows(database, 'oauth_authorization_code'), 0)
})

test('the authorization code gives tokens for the granted scopes only once', async () => {
  const database = await createDatabaseWithUsers()
  const clientId = await registerClient(database)
  const code = await authorize(database, clientId)

  const { status, body } = await exchangeCode(database, clientId, code)

  assert.equal(status, 200)
  assert.deepEqual(Object.keys(body).sort(), ['access_token', 'expires_in', 'refresh_token', 'scope', 'token_type'])
  assert.equal(body.token_type, 'Bearer')
  assert.equal(body.expires_in, 3600)
  assert.equal(body.scope, 'budget todo')
  assert.match(String(body.access_token), /^dcat_[\w-]{43}$/)
  assert.match(String(body.refresh_token), /^dcrt_[\w-]{43}$/)
  assert.deepEqual(await exchangeCode(database, clientId, code), invalidGrant)

  const caller = await findMcpCaller(String(body.access_token), NOW, database.event)
  assert.deepEqual(caller?.user, owner)
  assert.deepEqual(caller?.scopes, ['budget', 'todo'])
  const storedTokens = JSON.stringify(database.sqlite.prepare('SELECT * FROM oauth_token').all())
  assert.equal(storedTokens.includes(String(body.access_token)) || storedTokens.includes(String(body.refresh_token)), false)
})

test('the code exchange checks the verifier, the client, the redirect address, the resource and the lifetime', async () => {
  const database = await createDatabaseWithUsers()
  const clientId = await registerClient(database)
  const otherClientId = await registerClient(database)
  const exchangeNewCode = async (changes: Record<string, string>, now = NOW) =>
    exchangeCode(database, clientId, await authorize(database, clientId), changes, now)

  assert.deepEqual(await exchangeNewCode({ code_verifier: 'b'.repeat(43) }), invalidGrant)
  assert.deepEqual(await exchangeNewCode({ client_id: otherClientId }), invalidGrant)
  assert.deepEqual(await exchangeNewCode({ redirect_uri: 'https://claude.ai/other' }), invalidGrant)
  assert.deepEqual(await exchangeNewCode({}, later(AUTHORIZATION_CODE_LIFETIME_MS)), invalidGrant)
  assert.equal((await exchangeNewCode({ resource: 'https://example.com/api/mcp' })).body.error, 'invalid_target')
  assert.equal((await exchangeNewCode({ code_verifier: 'short' })).body.error, 'invalid_request')
  assert.equal((await exchangeNewCode({}, later(AUTHORIZATION_CODE_LIFETIME_MS - 1))).status, 200)
  assert.equal(countRows(database, 'oauth_grant'), 1)
})

test('the token endpoint refuses unknown grant types', async () => {
  const database = await createDatabaseWithUsers()

  assert.equal((await exchangeOAuthToken({ grant_type: 'client_credentials' }, ISSUER, NOW, database.event)).body.error, 'unsupported_grant_type')
  assert.equal((await exchangeOAuthToken({}, ISSUER, NOW, database.event)).body.error, 'invalid_request')
  assert.equal((await exchangeOAuthToken(undefined, ISSUER, NOW, database.event)).body.error, 'invalid_request')
})

test('a refresh token gives new tokens once and the old access token works until it expires', async () => {
  const database = await createDatabaseWithUsers()
  const { clientId, accessToken, refreshToken } = await connect(database)

  const refreshed = await refresh(database, clientId, refreshToken, later(1000))

  assert.equal(refreshed.status, 200)
  assert.equal(refreshed.body.scope, 'budget todo')
  assert.notEqual(refreshed.body.access_token, accessToken)
  assert.notEqual(refreshed.body.refresh_token, refreshToken)
  assert.deepEqual(await refresh(database, clientId, refreshToken, later(2000)), invalidGrant)
  assert.notEqual(await findMcpCaller(accessToken, later(2000), database.event), null)
  assert.notEqual(await findMcpCaller(String(refreshed.body.access_token), later(2000), database.event), null)
  assert.equal((await refresh(database, clientId, String(refreshed.body.refresh_token), later(3000))).status, 200)
  assert.equal(countRows(database, 'oauth_grant'), 1)
})

test('a refresh token of another client or after its lifetime is refused', async () => {
  const database = await createDatabaseWithUsers()
  const first = await connect(database)
  const second = await connect(database)

  assert.deepEqual(await refresh(database, second.clientId, first.refreshToken), invalidGrant)
  assert.deepEqual(await refresh(database, second.clientId, second.refreshToken, later(REFRESH_TOKEN_LIFETIME_MS)), invalidGrant)
  assert.deepEqual(await refresh(database, second.clientId, second.accessToken), invalidGrant)
})

test('an access token works for an hour', async () => {
  const database = await createDatabaseWithUsers()
  const { accessToken } = await connect(database)

  assert.notEqual(await findMcpCaller(accessToken, later(ACCESS_TOKEN_LIFETIME_MS - 1), database.event), null)
  assert.equal(await findMcpCaller(accessToken, later(ACCESS_TOKEN_LIFETIME_MS), database.event), null)
})

test('findMcpCaller ignores unknown tokens and skips the database for a foreign format', async () => {
  const database = await createDatabaseWithUsers()
  const { refreshToken } = await connect(database)
  const requestCount = database.getRequestCount()

  assert.equal(await findMcpCaller('session-token', NOW, database.event), null)
  assert.equal(await findMcpCaller(refreshToken, NOW, database.event), null)
  assert.equal(database.getRequestCount(), requestCount)
  assert.equal(await findMcpCaller('dcat_unknown', NOW, database.event), null)
})

test('findMcpCaller records the use of a connection at most once an hour', async () => {
  const database = await createDatabaseWithUsers()
  const { clientId, accessToken, refreshToken } = await connect(database)
  const readLastUse = async () => (await listMcpConnections(owner.id, database.event))[0]?.lastUsedAt

  await findMcpCaller(accessToken, NOW, database.event)
  assert.equal(await readLastUse(), NOW.toISOString())

  await findMcpCaller(accessToken, later(LAST_USED_REFRESH_MS - 1), database.event)
  assert.equal(await readLastUse(), NOW.toISOString())

  const refreshed = await refresh(database, clientId, refreshToken, later(LAST_USED_REFRESH_MS - 1))
  await findMcpCaller(String(refreshed.body.access_token), later(LAST_USED_REFRESH_MS), database.event)
  assert.equal(await readLastUse(), later(LAST_USED_REFRESH_MS).toISOString())
})

test('a user sees and disconnects only their own connections', async () => {
  const database = await createDatabaseWithUsers()
  const { clientId, accessToken, refreshToken } = await connect(database)
  const [connection] = await listMcpConnections(owner.id, database.event)

  assert.deepEqual(connection, { id: connection?.id, clientName: 'Claude', scopes: ['budget', 'todo'], createdAt: NOW.toISOString(), lastUsedAt: null })
  assert.deepEqual(await listMcpConnections(friend.id, database.event), [])
  await assert.rejects(deleteMcpConnection(friend.id, connection?.id ?? '', database.event), {
    statusCode: 404,
    message: ERROR_KEYS.MCP_CONNECTION_NOT_FOUND,
  })
  assert.notEqual(await findMcpCaller(accessToken, NOW, database.event), null)

  await deleteMcpConnection(owner.id, connection?.id ?? '', database.event)

  assert.equal(await findMcpCaller(accessToken, NOW, database.event), null)
  assert.deepEqual(await refresh(database, clientId, refreshToken), invalidGrant)
  assert.deepEqual(await listMcpConnections(owner.id, database.event), [])
})

test('deleting a user deletes the connections and the codes', async () => {
  const database = await createDatabaseWithUsers()
  const { accessToken, clientId } = await connect(database)
  await authorize(database, clientId)

  await useDatabase(database.event).delete(user).where(eq(user.id, owner.id))

  assert.equal(await findMcpCaller(accessToken, NOW, database.event), null)
  assert.equal(countRows(database, 'oauth_grant'), 0)
  assert.equal(countRows(database, 'oauth_token'), 0)
  assert.equal(countRows(database, 'oauth_authorization_code'), 0)
})
