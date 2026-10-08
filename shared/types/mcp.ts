import type { z } from 'zod'
import type { createMcpTokenSchema, McpScope } from '~~/shared/schemas/mcp'

export interface McpTokenSummary {
  id: string
  name: string
  scopes: McpScope[]
  createdAt: string
  lastUsedAt: string | null
}

export interface CreatedMcpToken {
  token: McpTokenSummary
  secret: string
}

export interface McpTokensData {
  tokens: McpTokenSummary[]
}

export type CreateMcpTokenPayload = z.infer<typeof createMcpTokenSchema>
