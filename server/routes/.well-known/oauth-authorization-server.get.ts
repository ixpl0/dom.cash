import { buildAuthorizationServerMetadata, getIssuer } from '~~/server/services/mcp/oauth-metadata'

export default defineEventHandler(event => buildAuthorizationServerMetadata(getIssuer(event)))
