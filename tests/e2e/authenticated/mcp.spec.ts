import type { APIRequestContext } from '@playwright/test'
import { test, expect } from '../fixtures'
import { BASE_URL } from '../constants'
import { cleanupUserData } from '../helpers/auth'
import { acceptConfirmModal } from '../helpers/confirmation'
import { readClipboardText } from '../helpers/text'
import { waitForHydration } from '../helpers/wait-for-hydration'

interface ToolCallResponse {
  result: {
    content: Array<{ text: string }>
    isError?: boolean
  }
}

const MCP_URL = `${BASE_URL}/api/mcp`

const callMcp = (request: APIRequestContext, secret: string | null, method: string, params: Record<string, unknown> = {}) =>
  request.post(MCP_URL, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    data: { jsonrpc: '2.0', id: 1, method, params },
  })

test.describe('Claude access', () => {
  test.beforeEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('creates a token that lets an MCP client read the tasks of its scopes, then revokes it', async ({ page, request, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const taskResponse = await request.post('/api/todo', { data: { content: 'Ask Claude about me', plannedDate: '2099-01-01T00:00' } })
    expect(taskResponse.ok()).toBe(true)

    await page.goto('/')
    await waitForHydration(page)
    await page.getByTestId('user-dropdown').click()
    await page.getByTestId('mcp-btn').click()

    const modal = page.getByTestId('mcp-modal')
    await expect(modal).toBeVisible()
    await expect(page.getByTestId('user-dropdown-content')).toBeHidden()
    await expect(modal.getByTestId('mcp-empty-state')).toBeVisible()
    await expect(modal.getByTestId('mcp-create-btn')).toBeDisabled()

    await modal.getByTestId('mcp-token-name-input').fill('Laptop')
    await modal.getByTestId('mcp-scope-docs').uncheck()
    await modal.getByTestId('mcp-create-btn').click()

    const secretInput = modal.getByTestId('mcp-token-secret')
    await expect(secretInput).toBeVisible()
    const secret = await secretInput.inputValue()
    expect(secret).toMatch(/^dcmcp_[\w-]{43}$/)
    await expect(modal.getByTestId('mcp-command')).toHaveText(
      `claude mcp add --transport http --scope user dom-cash ${MCP_URL} --header "Authorization: Bearer ${secret}"`,
    )
    await expect(modal.getByTestId('mcp-token-row')).toHaveCount(1)
    await expect(modal.getByTestId('mcp-token-name')).toHaveText('Laptop')
    await expect(modal.getByTestId('mcp-token-scope')).toHaveCount(2)
    await expect(modal.getByTestId('mcp-token-name-input')).toHaveValue('')

    await modal.getByTestId('mcp-copy-secret-btn').click()
    expect(await readClipboardText(page)).toBe(secret)

    const initializeResponse = await callMcp(request, secret, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '1' } })
    expect(initializeResponse.status()).toBe(200)
    expect((await initializeResponse.json()).result.protocolVersion).toBe('2025-06-18')

    const toolsResponse = await callMcp(request, secret, 'tools/list')
    const { result: { tools } } = await toolsResponse.json() as { result: { tools: Array<{ name: string }> } }
    expect(tools.map(({ name }) => name)).toEqual(['get_budget_summary', 'get_budget_month', 'list_tasks'])

    const tasksResponse = await callMcp(request, secret, 'tools/call', { name: 'list_tasks', arguments: {} })
    const { result } = await tasksResponse.json() as ToolCallResponse
    expect(result.isError).toBeUndefined()
    expect(JSON.parse(result.content[0]?.text ?? '')).toEqual({
      count: 1,
      tasks: [{ text: 'Ask Claude about me', plannedDate: '2099-01-01T00:00' }],
    })

    expect((await callMcp(request, null, 'ping')).status()).toBe(401)

    await modal.getByTestId('mcp-modal-close').click()
    await expect(modal).toBeHidden()
    await page.getByTestId('user-dropdown').click()
    await page.getByTestId('mcp-btn').click()
    await expect(modal.getByTestId('mcp-token-row')).toHaveCount(1)
    await expect(modal.getByTestId('mcp-created-token')).toBeHidden()

    await modal.getByTestId('mcp-token-revoke-btn').click()
    await acceptConfirmModal(page)
    await expect(modal.getByTestId('mcp-empty-state')).toBeVisible()
    expect((await callMcp(request, secret, 'ping')).status()).toBe(401)
  })

  test('asks before closing the window with a typed token name', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
    await page.getByTestId('user-dropdown').click()
    await page.getByTestId('mcp-btn').click()

    const modal = page.getByTestId('mcp-modal')
    await modal.getByTestId('mcp-token-name-input').fill('Desktop')
    await page.keyboard.press('Escape')

    await acceptConfirmModal(page)
    await expect(modal).toBeHidden()
  })
})
