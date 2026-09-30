import { createError, defineEventHandler } from 'h3'
import { isCrossOriginRequest, isWriteRequest } from '~~/server/utils/request'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler((event) => {
  if (!isWriteRequest(event) || !isCrossOriginRequest(event)) {
    return
  }

  throw createError({
    statusCode: 403,
    message: ERROR_KEYS.CROSS_ORIGIN_REQUEST,
  })
})
