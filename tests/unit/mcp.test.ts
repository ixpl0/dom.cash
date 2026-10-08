import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { eq } from 'drizzle-orm'
import { useDatabase } from '../../server/db'
import { budgetShare, currency, docDocument, docFolder, docFolderShare, entry, month, plan, todo, todoShare, user } from '../../server/db/schema'
import { handleMcpMessage, type McpReply } from '../../server/services/mcp/protocol'
import {
  createMcpToken,
  deleteMcpToken,
  findMcpCaller,
  LAST_USED_REFRESH_MS,
  listMcpTokens,
  MCP_TOKEN_PREFIX,
  readBearerToken,
} from '../../server/services/mcp/tokens'
import { describeRecurrence } from '../../server/services/mcp/todo-tools'
import type { McpContext } from '../../server/services/mcp/tool-definition'
import { hashToken } from '../../server/utils/crypto'
import { MCP_MAX_TOKENS, MCP_SCOPES, type McpScope } from '../../shared/schemas/mcp'
import type { User } from '../../shared/types'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'
import { createTestDatabase, type TestDatabase } from './helpers/test-database'

interface ToolCallResult {
  content: Array<{ type: string, text: string }>
  isError?: boolean
}

interface ListedTool {
  name: string
  inputSchema: Record<string, unknown>
  annotations: { readOnlyHint: boolean }
}

const NOW = new Date('2026-08-15T12:00:00Z')

const ALL_SCOPES: McpScope[] = [...MCP_SCOPES]

const toUser = (id: string): User => ({ id, username: `${id}@example.com`, mainCurrency: 'USD', isAdmin: false })

const owner = toUser('owner')
const friend = toUser('friend')
const stranger = toUser('stranger')

const pinClock = (context: TestContext) => {
  context.mock.timers.enable({ apis: ['Date'], now: NOW })
}

const createDatabaseWithUsers = async (): Promise<TestDatabase> => {
  const database = createTestDatabase()
  await useDatabase(database.event).insert(user).values([owner, friend, stranger].map(({ id, username }) => ({
    id,
    username,
    passwordHash: 'hash',
    mainCurrency: 'USD',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  })))
  return database
}

const createContext = (database: TestDatabase, viewer: User, scopes: McpScope[] = ALL_SCOPES): McpContext =>
  ({ event: database.event, user: viewer, scopes })

const readResult = (reply: McpReply): unknown => {
  assert.ok(reply.status === 200 && 'result' in reply.body, JSON.stringify(reply))
  return reply.body.result
}

const sendRequest = async (database: TestDatabase, method: string, params?: Record<string, unknown>, scopes: McpScope[] = ALL_SCOPES) =>
  handleMcpMessage({ jsonrpc: '2.0', id: 7, method, ...(params ? { params } : {}) }, createContext(database, owner, scopes))

const callTool = async (database: TestDatabase, viewer: User, name: string, args: Record<string, unknown> = {}) => {
  const reply = await handleMcpMessage(
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
    createContext(database, viewer),
  )
  const result = readResult(reply) as ToolCallResult
  return { isError: result.isError ?? false, text: result.content[0]?.text ?? '' }
}

const readToolData = async (database: TestDatabase, viewer: User, name: string, args: Record<string, unknown> = {}): Promise<unknown> => {
  const { isError, text } = await callTool(database, viewer, name, args)
  assert.equal(isError, false, text)
  return JSON.parse(text)
}

const readStoredToken = (database: TestDatabase, tokenId: string) =>
  database.sqlite.prepare('SELECT token_hash AS tokenHash, last_used_at AS lastUsedAt, scopes FROM mcp_token WHERE id = ?').get(tokenId)

test('readBearerToken takes the token from a Bearer authorization header only', () => {
  assert.equal(readBearerToken('Bearer dcmcp_abc'), 'dcmcp_abc')
  assert.equal(readBearerToken('  bearer   dcmcp_abc  '), 'dcmcp_abc')
  assert.equal(readBearerToken('Basic dcmcp_abc'), null)
  assert.equal(readBearerToken('Bearer'), null)
  assert.equal(readBearerToken(undefined), null)
})

test('createMcpToken returns the secret once and stores only its hash with the scopes in a fixed order', async () => {
  const database = await createDatabaseWithUsers()

  const { token, secret } = await createMcpToken(owner.id, { name: 'Laptop', scopes: ['docs', 'budget', 'docs'] }, NOW, database.event)

  assert.ok(secret.startsWith(MCP_TOKEN_PREFIX))
  assert.deepEqual(token, { id: token.id, name: 'Laptop', scopes: ['budget', 'docs'], createdAt: NOW.toISOString(), lastUsedAt: null })
  assert.deepEqual(await listMcpTokens(owner.id, database.event), [token])
  assert.deepEqual(await listMcpTokens(friend.id, database.event), [])

  const stored = readStoredToken(database, token.id)
  assert.equal(stored?.tokenHash, hashToken(secret))
  assert.equal(stored?.scopes, '["budget","docs"]')
  assert.ok(!JSON.stringify(database.sqlite.prepare('SELECT * FROM mcp_token').all()).includes(secret))
})

test('createMcpToken refuses a token over the limit and writes nothing', async () => {
  const database = await createDatabaseWithUsers()
  await Promise.all(Array.from({ length: MCP_MAX_TOKENS }, (_, index) =>
    createMcpToken(owner.id, { name: `Token ${index}`, scopes: ['todo'] }, NOW, database.event)))

  await assert.rejects(createMcpToken(owner.id, { name: 'One more', scopes: ['todo'] }, NOW, database.event), {
    statusCode: 409,
    message: ERROR_KEYS.MCP_TOO_MANY_TOKENS,
  })
  assert.equal((await listMcpTokens(owner.id, database.event)).length, MCP_MAX_TOKENS)
  assert.equal((await createMcpToken(friend.id, { name: 'Friend', scopes: ['todo'] }, NOW, database.event)).token.name, 'Friend')
})

test('findMcpCaller finds the owner of a token and records its use at most once an hour', async () => {
  const database = await createDatabaseWithUsers()
  const { token, secret } = await createMcpToken(owner.id, { name: 'Laptop', scopes: ['budget', 'todo'] }, NOW, database.event)
  const firstUse = new Date(NOW.getTime() + 1000)

  assert.deepEqual(await findMcpCaller(secret, firstUse, database.event), { tokenId: token.id, user: owner, scopes: ['budget', 'todo'] })
  assert.equal(readStoredToken(database, token.id)?.lastUsedAt, firstUse.getTime())

  await findMcpCaller(secret, new Date(firstUse.getTime() + LAST_USED_REFRESH_MS - 1), database.event)
  assert.equal(readStoredToken(database, token.id)?.lastUsedAt, firstUse.getTime())

  const laterUse = new Date(firstUse.getTime() + LAST_USED_REFRESH_MS)
  await findMcpCaller(secret, laterUse, database.event)
  assert.equal(readStoredToken(database, token.id)?.lastUsedAt, laterUse.getTime())
  assert.equal((await listMcpTokens(owner.id, database.event))[0]?.lastUsedAt, laterUse.toISOString())
})

test('findMcpCaller ignores unknown secrets and skips the database for a foreign format', async () => {
  const database = await createDatabaseWithUsers()
  await createMcpToken(owner.id, { name: 'Laptop', scopes: ['budget'] }, NOW, database.event)
  const requestCount = database.getRequestCount()

  assert.equal(await findMcpCaller('session-token', NOW, database.event), null)
  assert.equal(database.getRequestCount(), requestCount)
  assert.equal(await findMcpCaller(`${MCP_TOKEN_PREFIX}unknown`, NOW, database.event), null)
})

test('deleteMcpToken revokes only a token of the user', async () => {
  const database = await createDatabaseWithUsers()
  const { token, secret } = await createMcpToken(owner.id, { name: 'Laptop', scopes: ['budget'] }, NOW, database.event)

  await assert.rejects(deleteMcpToken(friend.id, token.id, database.event), {
    statusCode: 404,
    message: ERROR_KEYS.MCP_TOKEN_NOT_FOUND,
  })
  assert.notEqual(await findMcpCaller(secret, NOW, database.event), null)

  await deleteMcpToken(owner.id, token.id, database.event)
  assert.equal(await findMcpCaller(secret, NOW, database.event), null)
  assert.deepEqual(await listMcpTokens(owner.id, database.event), [])
})

test('deleting a user deletes the tokens', async () => {
  const database = await createDatabaseWithUsers()
  const { secret } = await createMcpToken(owner.id, { name: 'Laptop', scopes: ['budget'] }, NOW, database.event)

  await useDatabase(database.event).delete(user).where(eq(user.id, owner.id))

  assert.equal(database.sqlite.prepare('SELECT count(*) AS total FROM mcp_token').get()?.total, 0)
  assert.equal(await findMcpCaller(secret, NOW, database.event), null)
})

test('initialize answers with a supported requested version and describes the token scopes', async () => {
  const database = await createDatabaseWithUsers()

  const reply = await sendRequest(database, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } }, ['budget', 'todo'])

  assert.deepEqual(readResult(reply), {
    protocolVersion: '2025-06-18',
    capabilities: { tools: {} },
    serverInfo: { name: 'dom-cash', title: 'dom.cash', version: '1.0.0' },
    instructions: 'Read-only access to the user\'s data in dom.cash, a personal finance app: the budget (account balances, incomes, expenses, plans), tasks.',
  })
})

test('initialize offers the latest version when the requested one is unknown', async () => {
  const database = await createDatabaseWithUsers()

  const result = readResult(await sendRequest(database, 'initialize', { protocolVersion: '2099-01-01' })) as { protocolVersion: string }

  assert.equal(result.protocolVersion, '2025-11-25')
})

test('notifications and client responses are accepted without an answer', async () => {
  const database = await createDatabaseWithUsers()
  const context = createContext(database, owner)

  assert.deepEqual(await handleMcpMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, context), { status: 202 })
  assert.deepEqual(await handleMcpMessage({ jsonrpc: '2.0', id: 3, result: {} }, context), { status: 202 })
})

test('a message that is not a JSON-RPC request is refused', async () => {
  const database = await createDatabaseWithUsers()
  const context = createContext(database, owner)
  const refusal = { status: 400, body: { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } } }

  assert.deepEqual(await handleMcpMessage([{ jsonrpc: '2.0', id: 1, method: 'ping' }], context), refusal)
  assert.deepEqual(await handleMcpMessage({ id: 1, method: 'ping' }, context), refusal)
  assert.deepEqual(await handleMcpMessage('ping', context), refusal)
})

test('ping answers and an unknown method gets the method not found error', async () => {
  const database = await createDatabaseWithUsers()

  assert.deepEqual(await sendRequest(database, 'ping'), { status: 200, body: { jsonrpc: '2.0', id: 7, result: {} } })
  assert.deepEqual(await sendRequest(database, 'resources/list'), {
    status: 200,
    body: { jsonrpc: '2.0', id: 7, error: { code: -32601, message: 'Method not found: resources/list' } },
  })
})

test('tools/list shows only the read-only tools of the token scopes', async () => {
  const database = await createDatabaseWithUsers()
  const listTools = async (scopes: McpScope[]): Promise<ListedTool[]> =>
    (readResult(await sendRequest(database, 'tools/list', undefined, scopes)) as { tools: ListedTool[] }).tools

  const allTools = await listTools(ALL_SCOPES)

  assert.deepEqual(allTools.map(({ name }) => name), ['get_budget_summary', 'get_budget_month', 'list_tasks', 'list_doc_folders', 'search_documents'])
  assert.deepEqual((await listTools(['todo'])).map(({ name }) => name), ['list_tasks'])
  assert.deepEqual((await listTools(['docs'])).map(({ name }) => name), ['list_doc_folders', 'search_documents'])
  allTools.forEach(({ name, inputSchema, annotations }) => {
    assert.equal(inputSchema.type, 'object', name)
    assert.equal('$schema' in inputSchema, false, name)
    assert.equal(annotations.readOnlyHint, true, name)
  })
})

test('tools/call refuses a tool outside the token scopes', async () => {
  const database = await createDatabaseWithUsers()

  assert.deepEqual(await sendRequest(database, 'tools/call', { name: 'get_budget_summary', arguments: {} }, ['todo']), {
    status: 200,
    body: { jsonrpc: '2.0', id: 7, error: { code: -32602, message: 'Unknown tool: get_budget_summary' } },
  })
})

test('tools/call reports invalid arguments to the model', async () => {
  const database = await createDatabaseWithUsers()

  assert.deepEqual(await callTool(database, owner, 'get_budget_month', { month: '2026-13' }), {
    isError: true,
    text: 'Invalid arguments: month: Expected YYYY-MM',
  })
})

const createBudget = async (): Promise<TestDatabase> => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  await db.insert(currency).values([
    { date: '2026-06-01', rates: { USD: 1, EUR: 0.8 } },
    { date: '2026-07-01', rates: { USD: 1, EUR: 0.5 } },
  ])
  await db.insert(month).values([
    { id: 'june', userId: owner.id, year: 2026, month: 5 },
    { id: 'july', userId: owner.id, year: 2026, month: 6 },
  ])
  await db.insert(entry).values([
    { id: 'june-bank', monthId: 'june', kind: 'balance', description: 'Bank', amount: 1000, currency: 'USD' },
    { id: 'june-savings', monthId: 'june', kind: 'balance', description: 'Savings', amount: 400, currency: 'EUR' },
    { id: 'june-salary', monthId: 'june', kind: 'income', description: 'Salary', amount: 3000, currency: 'USD', date: '2026-06-05' },
    { id: 'june-rent', monthId: 'june', kind: 'expense', description: 'Rent', amount: 1200, currency: 'USD', date: '2026-06-01', isOptional: false },
    { id: 'june-cinema', monthId: 'june', kind: 'expense', description: 'Cinema', amount: 50, currency: 'USD', isOptional: true },
    { id: 'july-bank', monthId: 'july', kind: 'balance', description: 'Bank', amount: 2500, currency: 'USD' },
    { id: 'july-savings', monthId: 'july', kind: 'balance', description: 'Savings', amount: 400, currency: 'EUR' },
  ])
  await db.insert(plan).values([
    { id: 'plan-july', userId: owner.id, year: 2026, month: 6, plannedBalanceChange: 600, comment: 'Vacation' },
    { id: 'plan-august', userId: owner.id, year: 2026, month: 7, plannedBalanceChange: 500, comment: null },
    { id: 'plan-september', userId: owner.id, year: 2026, month: 8, plannedBalanceChange: 1000, comment: null },
  ])
  await db.insert(budgetShare).values({ id: 'share', ownerId: owner.id, sharedWithId: friend.id, access: 'read', createdAt: NOW })
  return database
}

const JUNE_TOTALS = {
  month: '2026-06',
  startBalance: 1500,
  income: 3000,
  expenses: 1250,
  optionalExpenses: 50,
  pocketExpenses: 250,
  allExpenses: 1500,
  currencyFluctuations: 300,
  balanceChange: 1800,
}

const JULY_TOTALS = {
  month: '2026-07',
  startBalance: 3300,
  income: 0,
  expenses: 0,
  optionalExpenses: 0,
  pocketExpenses: null,
  allExpenses: null,
  currencyFluctuations: null,
  balanceChange: null,
}

test('get_budget_summary gives the latest recorded months, the planned months after them and the year totals', async (context) => {
  pinClock(context)
  const database = await createBudget()

  assert.deepEqual(await readToolData(database, owner, 'get_budget_summary'), {
    owner: owner.username,
    mainCurrency: 'USD',
    access: 'owner',
    months: [
      JUNE_TOTALS,
      { ...JULY_TOTALS, plan: { balanceChange: 600, comment: 'Vacation', expectedBalance: 3300 } },
      { month: '2026-08', planOnly: true, plan: { balanceChange: 500, expectedBalance: 3800 } },
      { month: '2026-09', planOnly: true, plan: { balanceChange: 1000, expectedBalance: 4800 } },
    ],
    years: [{
      year: 2026,
      months: 4,
      income: 3000,
      expenses: 1250,
      pocketExpenses: 250,
      allExpenses: 1500,
      currencyFluctuations: 300,
      balanceChange: 1800,
      averageIncome: 1500,
      averageAllExpenses: 1500,
      averageBalanceChange: 1800,
      plannedBalanceChange: 2100,
      expectedYearEndBalance: 4800,
    }],
  })
})

test('get_budget_summary keeps to the requested months', async (context) => {
  pinClock(context)
  const database = await createBudget()

  const summary = await readToolData(database, owner, 'get_budget_summary', { from: '2026-06', to: '2026-06' }) as { months: unknown[] }

  assert.deepEqual(summary.months, [JUNE_TOTALS])
})

test('get_budget_summary shows a reader the shared budget without plans', async (context) => {
  pinClock(context)
  const database = await createBudget()

  const summary = await readToolData(database, friend, 'get_budget_summary', { username: 'OWNER@example.com' }) as Record<string, unknown>

  assert.equal(summary.access, 'read')
  assert.deepEqual(summary.months, [JUNE_TOTALS, JULY_TOTALS])
  assert.deepEqual(summary.budgetsSharedWithUser, [{ owner: owner.username, access: 'read' }])
  assert.equal((summary.years as Array<Record<string, unknown>>)[0]?.plannedBalanceChange, undefined)
})

test('get_budget_summary refuses a budget that is not shared and a wrong range', async (context) => {
  pinClock(context)
  const database = await createBudget()

  assert.deepEqual(await callTool(database, stranger, 'get_budget_summary', { username: owner.username }), { isError: true, text: 'access_denied' })
  assert.deepEqual(await callTool(database, owner, 'get_budget_summary', { username: 'nobody@example.com' }), { isError: true, text: 'user_not_found' })
  assert.deepEqual(await callTool(database, owner, 'get_budget_summary', { from: '2026-07', to: '2026-06' }), {
    isError: true,
    text: 'from must not be later than to',
  })
  assert.deepEqual(await callTool(database, owner, 'get_budget_summary', { from: '2010-01', to: '2026-06' }), {
    isError: true,
    text: 'The range must not be longer than 120 months',
  })
})

test('get_budget_summary of an empty budget has no months', async (context) => {
  pinClock(context)
  const database = await createDatabaseWithUsers()

  assert.deepEqual(await readToolData(database, owner, 'get_budget_summary'), {
    owner: owner.username,
    mainCurrency: 'USD',
    access: 'owner',
    months: [],
    years: [],
  })
})

test('get_budget_month lists the entries in their currencies with the month totals', async (context) => {
  pinClock(context)
  const database = await createBudget()

  assert.deepEqual(await readToolData(database, owner, 'get_budget_month', { month: '2026-06' }), {
    owner: owner.username,
    mainCurrency: 'USD',
    access: 'owner',
    totals: JUNE_TOTALS,
    balances: [
      { description: 'Bank', amount: 1000, currency: 'USD' },
      { description: 'Savings', amount: 400, currency: 'EUR', inMainCurrency: 500 },
    ],
    incomes: [{ description: 'Salary', amount: 3000, currency: 'USD', date: '2026-06-05' }],
    expenses: [
      { description: 'Rent', amount: 1200, currency: 'USD', date: '2026-06-01' },
      { description: 'Cinema', amount: 50, currency: 'USD', optional: true },
    ],
  })
})

test('get_budget_month takes the latest recorded month by default and knows planned months', async (context) => {
  pinClock(context)
  const database = await createBudget()

  const latest = await readToolData(database, owner, 'get_budget_month') as Record<string, unknown>
  const planned = await readToolData(database, owner, 'get_budget_month', { month: '2026-09' }) as Record<string, unknown>

  assert.deepEqual(latest.totals, { ...JULY_TOTALS, plan: { balanceChange: 600, comment: 'Vacation', expectedBalance: 3300 } })
  assert.deepEqual(latest.balances, [
    { description: 'Bank', amount: 2500, currency: 'USD' },
    { description: 'Savings', amount: 400, currency: 'EUR', inMainCurrency: 800 },
  ])
  assert.deepEqual(planned.totals, { month: '2026-09', planOnly: true, plan: { balanceChange: 1000, expectedBalance: 4800 } })
  assert.deepEqual(await callTool(database, owner, 'get_budget_month', { month: '2020-01' }), {
    isError: true,
    text: 'The budget has no data for 2020-01',
  })
})

test('describeRecurrence names every kind of repetition', () => {
  assert.equal(describeRecurrence({ type: 'interval', unit: 'day', value: 1 }), 'every day')
  assert.equal(describeRecurrence({ type: 'interval', unit: 'week', value: 3 }), 'every 3 weeks')
  assert.equal(describeRecurrence({ type: 'weekdays', days: [0, 3] }), 'every week on Wednesday, Sunday')
  assert.equal(describeRecurrence({ type: 'dayOfMonth', day: 15 }), 'every month on day 15')
})

const createTasks = async (): Promise<TestDatabase> => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  const toTask = (id: string, userId: string, content: string, plannedDate: string | null, isCompleted = false, updatedAt = NOW) => ({
    id,
    userId,
    content,
    plannedDate,
    isCompleted,
    recurrence: null,
    createdAt: NOW,
    updatedAt,
  })
  await db.insert(todo).values([
    toTask('rent', owner.id, 'Pay rent', '2026-08-20'),
    toTask('milk', owner.id, 'Buy milk', null),
    { ...toTask('mom', owner.id, 'Call mom', '2026-08-10T09:00'), recurrence: { type: 'weekdays', days: [4, 1] } },
    toTask('tree', owner.id, 'Купить ёлку', '2026-12-25'),
    toTask('old', owner.id, 'Old task', '2026-01-01', true, new Date('2026-02-01T00:00:00Z')),
    toTask('older', owner.id, 'Older task', '2025-01-01', true, new Date('2025-02-01T00:00:00Z')),
    toTask('car', friend.id, 'Fix car', '2026-08-01'),
    toTask('secret', stranger.id, 'Secret task', '2026-08-01'),
  ])
  await db.insert(todoShare).values({ id: 'car-share', todoId: 'car', sharedWithId: owner.id, createdAt: NOW })
  return database
}

test('list_tasks gives the open tasks by planned date, including the shared ones', async () => {
  const database = await createTasks()

  assert.deepEqual(await readToolData(database, owner, 'list_tasks'), {
    count: 5,
    tasks: [
      { text: 'Fix car', plannedDate: '2026-08-01', owner: friend.username },
      { text: 'Call mom', plannedDate: '2026-08-10T09:00', repeats: 'every week on Monday, Thursday' },
      { text: 'Pay rent', plannedDate: '2026-08-20' },
      { text: 'Купить ёлку', plannedDate: '2026-12-25' },
      { text: 'Buy milk' },
    ],
  })
})

test('list_tasks filters by status and by every word of the query', async () => {
  const database = await createTasks()
  const readTexts = async (args: Record<string, unknown>): Promise<string[]> =>
    ((await readToolData(database, owner, 'list_tasks', args)) as { tasks: Array<{ text: string }> }).tasks.map(({ text }) => text)

  assert.deepEqual(await readTexts({ status: 'completed' }), ['Old task', 'Older task'])
  assert.deepEqual(await readTexts({ status: 'all', query: 'task' }), ['Old task', 'Older task'])
  assert.deepEqual(await readTexts({ query: 'CAR fix' }), ['Fix car'])
  assert.deepEqual(await readTexts({ query: 'елк' }), ['Купить ёлку'])
  assert.deepEqual(await readTexts({ query: 'secret' }), [])
})

const createDocs = async (): Promise<TestDatabase> => {
  const database = await createDatabaseWithUsers()
  const db = useDatabase(database.event)
  const createdAt = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)
  await db.insert(docFolder).values([
    { id: 'masha', userId: owner.id, name: 'Маша', createdAt: createdAt(1), updatedAt: createdAt(1) },
    { id: 'car', userId: friend.id, name: 'Машина', createdAt: createdAt(2), updatedAt: createdAt(2) },
    { id: 'hidden', userId: stranger.id, name: 'Secret', createdAt: createdAt(3), updatedAt: createdAt(3) },
  ])
  await db.insert(docFolderShare).values({ id: 'car-share', folderId: 'car', sharedWithId: owner.id, createdAt: createdAt(2) })
  await db.insert(docDocument).values([
    { id: 'passport', folderId: 'masha', title: 'Паспорт', fields: [{ name: 'Номер', value: '4510 123456' }, { name: 'Выдан', value: '2020-01-01' }], createdAt: createdAt(4), updatedAt: createdAt(4) },
    { id: 'policy', folderId: 'masha', title: 'Полис ОМС', fields: [{ name: 'Номер', value: '777' }], createdAt: createdAt(5), updatedAt: createdAt(5) },
    { id: 'registration', folderId: 'car', title: 'СТС', fields: [{ name: 'VIN', value: 'XTA123' }], createdAt: createdAt(6), updatedAt: createdAt(6) },
    { id: 'hidden-passport', folderId: 'hidden', title: 'Паспорт', fields: [{ name: 'Номер', value: '0000' }], createdAt: createdAt(7), updatedAt: createdAt(7) },
  ])
  return database
}

test('list_doc_folders gives the visible folders with the titles of their documents', async () => {
  const database = await createDocs()

  assert.deepEqual(await readToolData(database, owner, 'list_doc_folders'), {
    folders: [
      { name: 'Маша', documents: ['Паспорт', 'Полис ОМС'] },
      { name: 'Машина', owner: friend.username, documents: ['СТС'] },
    ],
  })
})

test('search_documents gives the visible documents that contain every word with their fields', async () => {
  const database = await createDocs()

  assert.deepEqual(await readToolData(database, owner, 'search_documents', { query: 'паспорт' }), {
    count: 1,
    documents: [{ folder: 'Маша', title: 'Паспорт', fields: ['Номер: 4510 123456', 'Выдан: 2020-01-01'] }],
  })
  assert.deepEqual(await readToolData(database, owner, 'search_documents', { query: 'маш номер' }), {
    count: 2,
    documents: [
      { folder: 'Маша', title: 'Паспорт', fields: ['Номер: 4510 123456', 'Выдан: 2020-01-01'] },
      { folder: 'Маша', title: 'Полис ОМС', fields: ['Номер: 777'] },
    ],
  })
  assert.deepEqual(await readToolData(database, friend, 'search_documents', { query: 'xta' }), {
    count: 1,
    documents: [{ folder: 'Машина', title: 'СТС', fields: ['VIN: XTA123'] }],
  })
})
