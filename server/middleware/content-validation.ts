import { getMethod, getHeaders, createError } from 'h3'

const MAX_REQUEST_SIZE = 50 * 1024 * 1024 // 50MB

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const url = event.node.req.url || ''

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && url.startsWith('/api/')) {
    const headers = getHeaders(event)
    const contentType = headers['content-type']
    const contentLength = headers['content-length']

    // Список endpoints без body (не требуют Content-Type)
    const noBodyEndpoints = [
      '/api/auth/logout',
    ]

    // Endpoints с DELETE обычно без body
    const isDeleteRequest = method === 'DELETE'
    const isNoBodyEndpoint = noBodyEndpoints.includes(url)

    // Проверяем Content-Type только для запросов с body
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

    // Проверяем размер для всех запросов
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      throw createError({
        statusCode: 413,
        statusMessage: 'Payload Too Large',
        message: 'Request body too large. Maximum size is 50MB.',
      })
    }
  }
})
