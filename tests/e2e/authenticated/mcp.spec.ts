import { createHash, randomBytes } from 'node:crypto'
import type { APIRequestContext, Page } from '@playwright/test'
import { test, expect } from '../fixtures'
import { BASE_URL } from '../constants'
import { cleanupUserData } from '../helpers/auth'
import { acceptConfirmModal } from '../helpers/confirmation'
import { readClipboardText } from '../helpers/text'
import { waitForHydration } from '../helpers/wait-for-hydration'

interface TokenResponse {
  access_token: string
  refresh_token: string
  scope: string
}

const MCP_URL = `${BASE_URL}/api/mcp`
const CALLBACK = 'https://claude.ai/api/mcp/auth_callback'
const STATE = 'e2e-state'

const toBase64Url = (buffer: Buffer): string => buffer.toString('base64url')

const createVerifier = (): string => toBase64Url(randomBytes(32))

const createChallenge = (verifier: string): string => toBase64Url(createHash('sha256').update(verifier).digest())

const registerClaude = async (request: APIRequestContext): Promise<string> => {
  const response = await request.post('/oauth/register', {
    data: {
      redirect_uris: [CALLBACK],
      client_name: 'Claude',
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    },
  })
  expect(response.status()).toBe(201)
  return (await response.json()).client_id
}

const buildAuthorizeUrl = (clientId: string, verifier: string): string => `/oauth/authorize?${new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: CALLBACK,
  code_challenge: createChallenge(verifier),
  code_challenge_method: 'S256',
  state: STATE,
  scope: 'budget todo docs',
  resource: MCP_URL,
}).toString()}`

const catchClaudeCallback = (page: Page) =>
  page.route('https://claude.ai/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: 'Claude callback' }))

const waitForCallback = async (page: Page): Promise<URL> => {
  await page.waitForURL(url => url.href.startsWith(CALLBACK))
  return new URL(page.url())
}

const callMcp = (request: APIRequestContext, accessToken: string | null, method: string, params: Record<string, unknown> = {}) =>
  request.post(MCP_URL, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    data: { jsonrpc: '2.0', id: 1, method, params },
  })

test.describe('Claude access', () => {
  test.beforeEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('Claude connects through OAuth, reads the granted sections and loses access after a disconnect', async ({ page, request, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const taskResponse = await request.post('/api/todo', { data: { content: 'Ask Claude about me', plannedDate: '2099-01-01T00:00' } })
    expect(taskResponse.ok()).toBe(true)

    const resourceMetadata = await (await request.get('/.well-known/oauth-protected-resource/api/mcp')).json()
    expect(resourceMetadata.resource).toBe(MCP_URL)
    expect(resourceMetadata.authorization_servers).toEqual([BASE_URL])
    const serverMetadata = await (await request.get('/.well-known/oauth-authorization-server')).json()
    expect(serverMetadata.registration_endpoint).toBe(`${BASE_URL}/oauth/register`)
    const unauthorized = await callMcp(request, null, 'initialize')
    expect(unauthorized.status()).toBe(401)
    expect(unauthorized.headers()['www-authenticate']).toBe(`Bearer resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource/api/mcp"`)

    const clientId = await registerClaude(request)
    const verifier = createVerifier()
    await catchClaudeCallback(page)
    await page.goto(buildAuthorizeUrl(clientId, verifier))
    await waitForHydration(page)

    await expect(page.getByTestId('oauth-title')).toBeVisible()
    await page.getByTestId('oauth-scope-docs').uncheck()
    await page.getByTestId('oauth-allow-btn').click()
    const callback = await waitForCallback(page)
    expect(callback.searchParams.get('state')).toBe(STATE)
    const code = callback.searchParams.get('code') ?? ''

    const tokenResponse = await request.post('/oauth/token', {
      form: { grant_type: 'authorization_code', code, redirect_uri: CALLBACK, client_id: clientId, code_verifier: verifier, resource: MCP_URL },
    })
    expect(tokenResponse.status()).toBe(200)
    const tokens = await tokenResponse.json() as TokenResponse
    expect(tokens.scope).toBe('budget todo')

    const toolsResponse = await callMcp(request, tokens.access_token, 'tools/list')
    const { result: { tools } } = await toolsResponse.json() as { result: { tools: Array<{ name: string }> } }
    expect(tools.map(({ name }) => name)).toEqual(['get_budget_summary', 'get_budget_month', 'list_tasks'])
    const tasksResponse = await callMcp(request, tokens.access_token, 'tools/call', { name: 'list_tasks', arguments: {} })
    const { result } = await tasksResponse.json() as { result: { content: Array<{ text: string }> } }
    expect(JSON.parse(result.content[0]?.text ?? '')).toEqual({ count: 1, tasks: [{ text: 'Ask Claude about me', plannedDate: '2099-01-01T00:00' }] })

    const refreshResponse = await request.post('/oauth/token', {
      form: { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: clientId, resource: MCP_URL },
    })
    expect(refreshResponse.status()).toBe(200)
    const refreshedTokens = await refreshResponse.json() as TokenResponse
    const reusedRefresh = await request.post('/oauth/token', {
      form: { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: clientId },
    })
    expect(reusedRefresh.status()).toBe(400)
    expect((await reusedRefresh.json()).error).toBe('invalid_grant')

    await page.goto('/')
    await waitForHydration(page)
    await page.getByTestId('user-dropdown').click()
    await page.getByTestId('mcp-btn').click()
    const modal = page.getByTestId('mcp-modal')
    await expect(modal.getByTestId('mcp-server-url')).toHaveValue(MCP_URL)
    await modal.getByTestId('mcp-copy-url-btn').click()
    expect(await readClipboardText(page)).toBe(MCP_URL)
    await expect(modal.getByTestId('mcp-connection-row')).toHaveCount(1)
    await expect(modal.getByTestId('mcp-connection-scope')).toHaveCount(2)

    await modal.getByTestId('mcp-connection-disconnect-btn').click()
    await acceptConfirmModal(page)
    await expect(modal.getByTestId('mcp-empty-state')).toBeVisible()
    expect((await callMcp(request, refreshedTokens.access_token, 'ping')).status()).toBe(401)
  })

  test('a denied request sends Claude an error and no code', async ({ page, request }) => {
    const clientId = await registerClaude(request)
    await catchClaudeCallback(page)
    await page.goto(buildAuthorizeUrl(clientId, createVerifier()))
    await waitForHydration(page)

    await page.getByTestId('oauth-deny-btn').click()

    const callback = await waitForCallback(page)
    expect(callback.searchParams.get('error')).toBe('access_denied')
    expect(callback.searchParams.get('state')).toBe(STATE)
    expect(callback.searchParams.get('code')).toBeNull()
  })

  test('a signed-out user signs in first and comes back to the consent page', async ({ browser, request, workerCredentials }) => {
    const clientId = await registerClaude(request)
    const signedOutContext = await browser.newContext({ baseURL: BASE_URL, storageState: { cookies: [], origins: [] } })
    const page = await signedOutContext.newPage()

    await page.goto(buildAuthorizeUrl(clientId, createVerifier()))
    await expect(page).toHaveURL(/\/auth\?redirect=/)
    await waitForHydration(page)
    await page.getByTestId('email-input').fill(workerCredentials.email)
    await page.getByTestId('password-input').fill(workerCredentials.password)
    await page.getByTestId('login-btn').click()

    await expect(page.getByTestId('oauth-allow-btn')).toBeVisible()
    await expect(page).toHaveURL(/\/oauth\/authorize\?/)
    await signedOutContext.close()
  })

  test('a link with an unknown client shows an error instead of the consent', async ({ page }) => {
    await page.goto(buildAuthorizeUrl('unknown-client', createVerifier()))
    await waitForHydration(page)

    await expect(page.getByTestId('oauth-error')).toBeVisible()
    await expect(page.getByTestId('oauth-allow-btn')).toHaveCount(0)
  })
})
