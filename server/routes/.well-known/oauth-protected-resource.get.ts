import { buildProtectedResourceMetadata, getIssuer } from '~~/server/services/mcp/oauth-metadata'

export default defineEventHandler(event => buildProtectedResourceMetadata(getIssuer(event)))
