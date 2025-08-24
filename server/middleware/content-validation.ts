import { getMethod, getHeaders, createError } from 'h3'

const MAX_REQUEST_SIZE = 1 * 1024 * 1024 // 1MB

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
            message: 'Content-Type must be application/json',
          })
        }
      }
    }

    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      throw createError({
        statusCode: 413,
        statusMessage: 'Payload Too Large',
        message: 'Request body too large. Maximum size is 1MB.',
      })
    }
  }
})
