import { defineEventHandler, getMethod, getHeaders, createError } from 'h3'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const MAX_REQUEST_SIZE = 1 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const url = event.node.req.url || ''

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && url.startsWith('/api/')) {
    const headers = getHeaders(event)
    const contentType = headers['content-type']
    const contentLength = headers['content-length']

    const noBodyEndpoints = [
      '/api/auth/logout',
    ]

    const isDeleteRequest = method === 'DELETE'
    const isNoBodyEndpoint = noBodyEndpoints.includes(url)

    if (!isDeleteRequest && !isNoBodyEndpoint) {
      if (contentLength && parseInt(contentLength) > 0) {
        if (!contentType || !contentType.includes('application/json')) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: ERROR_KEYS.CONTENT_TYPE_REQUIRED,
          })
        }
      }
    }

    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      throw createError({
        statusCode: 413,
        statusMessage: 'Payload Too Large',
        message: ERROR_KEYS.PAYLOAD_TOO_LARGE,
      })
    }
  }
})
