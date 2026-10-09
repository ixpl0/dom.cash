import { readBody, setResponseHeader, setResponseStatus } from 'h3'
import { registerOAuthClient } from '~~/server/services/mcp/oauth-clients'

export default defineEventHandler(async (event) => {
  const { status, body } = await registerOAuthClient(await readBody(event), new Date(), event)
  setResponseStatus(event, status)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return body
})
