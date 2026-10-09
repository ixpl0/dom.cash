import { readBody, setResponseHeader, setResponseStatus } from 'h3'
import { getIssuer } from '~~/server/services/mcp/oauth-metadata'
import { exchangeOAuthToken } from '~~/server/services/mcp/oauth-tokens'

export default defineEventHandler(async (event) => {
  const { status, body } = await exchangeOAuthToken(await readBody(event), getIssuer(event), new Date(), event)
  setResponseStatus(event, status)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return body
})
