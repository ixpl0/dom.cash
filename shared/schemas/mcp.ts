import { z } from 'zod'

export const MCP_SCOPES = ['budget', 'todo', 'docs'] as const

export const MCP_TOKEN_NAME_MAX_LENGTH = 64

export const MCP_MAX_TOKENS = 10

export const mcpScopeSchema = z.enum(MCP_SCOPES)

export const createMcpTokenSchema = z.object({
  name: z.string().trim().min(1).max(MCP_TOKEN_NAME_MAX_LENGTH),
  scopes: z.array(mcpScopeSchema).min(1).max(MCP_SCOPES.length),
})

export type McpScope = z.infer<typeof mcpScopeSchema>
