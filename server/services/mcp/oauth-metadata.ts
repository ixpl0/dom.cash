import { getRequestURL, type H3Event } from 'h3'
import { MCP_SCOPES } from '~~/shared/schemas/mcp'

export const MCP_PATH = '/api/mcp'

export const PROTECTED_RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource'

export const OAUTH_GRANT_TYPES: readonly string[] = ['authorization_code', 'refresh_token']

export interface OAuthResponse {
  status: number
  body: Record<string, unknown>
}

export const oauthError = (status: number, error: string, description: string): OAuthResponse => ({
  status,
  body: { error, error_description: description },
})

export const getIssuer = (event: H3Event): string => getRequestURL(event).origin

export const getMcpResourceUrl = (issuer: string): string => `${issuer}${MCP_PATH}`

export const getProtectedResourceMetadataUrl = (issuer: string): string =>
  `${issuer}${PROTECTED_RESOURCE_METADATA_PATH}${MCP_PATH}`

const toCanonicalUrl = (value: string): string | null => {
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`.toLowerCase()
  }
  catch {
    return null
  }
}

export const isMcpResource = (resource: string, issuer: string): boolean =>
  toCanonicalUrl(resource) === toCanonicalUrl(getMcpResourceUrl(issuer))

export const buildProtectedResourceMetadata = (issuer: string) => ({
  resource: getMcpResourceUrl(issuer),
  authorization_servers: [issuer],
  scopes_supported: [...MCP_SCOPES],
  bearer_methods_supported: ['header'],
  resource_name: 'dom.cash',
})

export const buildAuthorizationServerMetadata = (issuer: string) => ({
  issuer,
  authorization_endpoint: `${issuer}/oauth/authorize`,
  token_endpoint: `${issuer}/oauth/token`,
  registration_endpoint: `${issuer}/oauth/register`,
  scopes_supported: [...MCP_SCOPES],
  response_types_supported: ['code'],
  grant_types_supported: [...OAUTH_GRANT_TYPES],
  token_endpoint_auth_methods_supported: ['none'],
  code_challenge_methods_supported: ['S256'],
})
