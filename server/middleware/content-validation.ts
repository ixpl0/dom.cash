import { getMethod, getHeaders, createError } from 'h3'

const MAX_REQUEST_SIZE = 50 * 1024 * 1024 // 50MB

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const url = event.node.req.url || ''

  if (['POST', 'PUT', 'PATCH'].includes(method) && url.startsWith('/api/')) {
    const headers = getHeaders(event)
    const contentType = headers['content-type']

    if (!contentType || !contentType.includes('application/json')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Content-Type must be application/json',
      })
    }

    const contentLength = headers['content-length']
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      throw createError({
        statusCode: 413,
        statusMessage: 'Payload Too Large',
        message: 'Request body too large. Maximum size is 50MB.',
      })
    }
  }
})
