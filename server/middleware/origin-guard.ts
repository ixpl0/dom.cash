import { createError, defineEventHandler } from 'h3'
import { getRoutePath, isCrossOriginRequest, isWriteRequest } from '~~/server/utils/request'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const COOKIELESS_ROUTES: readonly string[] = ['/api/mcp', '/oauth/register', '/oauth/token']

export default defineEventHandler((event) => {
  if (!isWriteRequest(event) || COOKIELESS_ROUTES.includes(getRoutePath(event)) || !isCrossOriginRequest(event)) {
    return
  }

  throw createError({
    statusCode: 403,
    message: ERROR_KEYS.CROSS_ORIGIN_REQUEST,
  })
})
