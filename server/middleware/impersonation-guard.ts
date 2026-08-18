import { defineEventHandler, getMethod, getCookie, createError } from 'h3'
import { IMPERSONATION_COOKIE } from '~~/server/utils/impersonation'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

export default defineEventHandler((event) => {
  const method = getMethod(event)
  const url = event.node.req.url || ''
  const path = url.split('?')[0] || ''

  if (!path.startsWith('/api/') || !WRITE_METHODS.includes(method)) {
    return
  }

  if (path === '/api/admin/impersonate' && method === 'DELETE') {
    return
  }

  if (path.startsWith('/api/notifications/')) {
    return
  }

  if (!getCookie(event, IMPERSONATION_COOKIE)) {
    return
  }

  throw createError({
    statusCode: 403,
    message: ERROR_KEYS.IMPERSONATION_READ_ONLY,
  })
})
