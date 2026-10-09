import type { z } from 'zod'
import type { McpScope, oauthAuthorizationRequestSchema, oauthDecisionSchema } from '~~/shared/schemas/mcp'

export interface McpConnection {
  id: string
  clientName: string
  scopes: McpScope[]
  createdAt: string
  lastUsedAt: string | null
}

export interface McpConnectionsData {
  connections: McpConnection[]
}

export interface OAuthAuthorizationDetails {
  clientName: string
  redirectHost: string
  scopes: McpScope[]
}

export interface OAuthDecisionResult {
  redirectUrl: string
}

export type OAuthAuthorizationRequest = z.infer<typeof oauthAuthorizationRequestSchema>

export type OAuthDecisionPayload = z.infer<typeof oauthDecisionSchema>
