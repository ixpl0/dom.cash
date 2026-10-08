import { z } from 'zod'
import type { McpContext, McpTool } from '~~/server/services/mcp/tool-definition'
import { findMcpTool, listMcpTools } from '~~/server/services/mcp/tools'
import { secureLog } from '~~/server/utils/secure-logger'
import type { McpScope } from '~~/shared/schemas/mcp'

export const MCP_PROTOCOL_VERSIONS: readonly string[] = ['2025-11-25', '2025-06-18', '2025-03-26']

const LATEST_PROTOCOL_VERSION = '2025-11-25'

const SERVER_INFO = { name: 'dom-cash', title: 'dom.cash', version: '1.0.0' }

const SCOPE_TOPICS: Readonly<Record<McpScope, string>> = {
  budget: 'the budget (account balances, incomes, expenses, plans)',
  todo: 'tasks',
  docs: 'documents',
}

const JSON_RPC_ERRORS = {
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
} as const

type RequestId = string | number

interface JsonRpcSuccess {
  jsonrpc: '2.0'
  id: RequestId
  result: unknown
}

interface JsonRpcFailure {
  jsonrpc: '2.0'
  id: RequestId | null
  error: { code: number, message: string }
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure

interface McpResponseReply {
  status: 200 | 400
  body: JsonRpcResponse
}

interface McpAcceptedReply {
  status: 202
}

export type McpReply = McpResponseReply | McpAcceptedReply

const requestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
})

const toolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional(),
})

type McpRequest = z.infer<typeof requestSchema>

const success = (id: RequestId, result: unknown): JsonRpcResponse => ({ jsonrpc: '2.0', id, result })

const failure = (id: RequestId | null, code: number, message: string): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  error: { code, message },
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNotificationOrResponse = (message: unknown): boolean =>
  isRecord(message)
  && message.jsonrpc === '2.0'
  && (
    (typeof message.method === 'string' && !('id' in message))
    || (!('method' in message) && ('result' in message || 'error' in message))
  )

const negotiateProtocolVersion = (requestedVersion: unknown): string =>
  typeof requestedVersion === 'string' && MCP_PROTOCOL_VERSIONS.includes(requestedVersion)
    ? requestedVersion
    : LATEST_PROTOCOL_VERSION

const describeInstructions = (scopes: readonly McpScope[]): string =>
  `Read-only access to the user's data in dom.cash, a personal finance app: ${scopes.map(scope => SCOPE_TOPICS[scope]).join(', ')}.`

const describeTool = ({ name, title, description, inputSchema }: McpTool) => ({
  name,
  title,
  description,
  inputSchema,
  annotations: { readOnlyHint: true },
})

const callTool = async (id: RequestId, params: McpRequest['params'], context: McpContext): Promise<JsonRpcResponse> => {
  const toolCall = toolCallSchema.safeParse(params)

  if (!toolCall.success) {
    return failure(id, JSON_RPC_ERRORS.invalidParams, 'Invalid tool call')
  }

  const tool = findMcpTool(toolCall.data.name, context.scopes)

  if (!tool) {
    return failure(id, JSON_RPC_ERRORS.invalidParams, `Unknown tool: ${toolCall.data.name}`)
  }

  return success(id, await tool.call(toolCall.data.arguments ?? {}, context))
}

const answerRequest = async ({ id, method, params }: McpRequest, context: McpContext): Promise<JsonRpcResponse> => {
  switch (method) {
    case 'initialize': {
      return success(id, {
        protocolVersion: negotiateProtocolVersion(params?.protocolVersion),
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: describeInstructions(context.scopes),
      })
    }
    case 'ping': {
      return success(id, {})
    }
    case 'tools/list': {
      return success(id, { tools: listMcpTools(context.scopes).map(describeTool) })
    }
    case 'tools/call': {
      return callTool(id, params, context)
    }
    default: {
      return failure(id, JSON_RPC_ERRORS.methodNotFound, `Method not found: ${method}`)
    }
  }
}

export const handleMcpMessage = async (message: unknown, context: McpContext): Promise<McpReply> => {
  const request = requestSchema.safeParse(message)

  if (!request.success) {
    return isNotificationOrResponse(message)
      ? { status: 202 }
      : { status: 400, body: failure(null, JSON_RPC_ERRORS.invalidRequest, 'Invalid Request') }
  }

  try {
    return { status: 200, body: await answerRequest(request.data, context) }
  }
  catch (error) {
    secureLog.error('MCP request failed:', error)
    return { status: 200, body: failure(request.data.id, JSON_RPC_ERRORS.internalError, 'Internal error') }
  }
}
