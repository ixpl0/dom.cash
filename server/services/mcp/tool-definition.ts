import { isError, type H3Event } from 'h3'
import { z } from 'zod'
import { secureLog } from '~~/server/utils/secure-logger'
import type { McpScope } from '~~/shared/schemas/mcp'
import type { User } from '~~/shared/types'

export interface McpContext {
  event: H3Event
  user: User
  scopes: McpScope[]
}

export interface McpToolResult {
  content: Array<{ type: 'text', text: string }>
  isError?: boolean
}

export interface McpTool {
  name: string
  title: string
  description: string
  scope: McpScope
  inputSchema: Record<string, unknown>
  call: (args: unknown, context: McpContext) => Promise<McpToolResult>
}

interface McpToolDefinition<T extends z.ZodType> {
  name: string
  title: string
  description: string
  scope: McpScope
  input: T
  run: (input: z.infer<T>, context: McpContext) => Promise<McpToolResult>
}

const SERVER_ERRORS_PREFIX = 'serverErrors.'

const INTERNAL_ERROR_TEXT = 'internal_server_error'

export const toolResult = (value: unknown): McpToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value) }],
})

export const toolError = (text: string): McpToolResult => ({
  content: [{ type: 'text', text }],
  isError: true,
})

const describeIssues = (error: z.ZodError): string =>
  error.issues
    .map(issue => `${issue.path.map(String).join('.') || 'arguments'}: ${issue.message}`)
    .join('; ')

const describeFailure = (error: unknown): string => {
  if (!isError(error) || error.statusCode >= 500) {
    secureLog.error('MCP tool failed:', error)
    return INTERNAL_ERROR_TEXT
  }

  return error.message.startsWith(SERVER_ERRORS_PREFIX)
    ? error.message.slice(SERVER_ERRORS_PREFIX.length)
    : error.message
}

const toInputSchema = (input: z.ZodType): Record<string, unknown> =>
  Object.fromEntries(Object.entries(z.toJSONSchema(input, { io: 'input' })).filter(([key]) => key !== '$schema'))

export const defineMcpTool = <T extends z.ZodType>({ input, run, ...tool }: McpToolDefinition<T>): McpTool => ({
  ...tool,
  inputSchema: toInputSchema(input),
  call: async (args, context) => {
    const parsed = input.safeParse(args)

    if (!parsed.success) {
      return toolError(`Invalid arguments: ${describeIssues(parsed.error)}`)
    }

    try {
      return await run(parsed.data, context)
    }
    catch (error) {
      return toolError(describeFailure(error))
    }
  },
})
