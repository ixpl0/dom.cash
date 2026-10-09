import { z } from 'zod'

export const MCP_SCOPES = ['budget', 'todo', 'docs'] as const

export const mcpScopeSchema = z.enum(MCP_SCOPES)

export const oauthAuthorizationRequestSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1).max(200),
  redirect_uri: z.string().min(1).max(2000),
  code_challenge: z.string().regex(/^[\w-]{43,128}$/),
  code_challenge_method: z.literal('S256'),
  state: z.string().max(2000).optional(),
  scope: z.string().max(500).optional(),
  resource: z.string().max(2000).optional(),
})

export const oauthDecisionSchema = z.object({
  request: oauthAuthorizationRequestSchema,
  grantedScopes: z.array(mcpScopeSchema).max(MCP_SCOPES.length),
  isApproved: z.boolean(),
})

export type McpScope = z.infer<typeof mcpScopeSchema>
