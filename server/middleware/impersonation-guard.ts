import { defineEventHandler, getCookie, createError } from 'h3'
import { IMPERSONATION_COOKIE } from '~~/server/utils/impersonation'
import { getRoutePath, isWriteRequest } from '~~/server/utils/request'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

interface AllowedWrite {
  method: string
  path: string
}

const ALLOWED_WRITES: readonly AllowedWrite[] = [
  { method: 'DELETE', path: '/api/admin/impersonate' },
  { method: 'POST', path: '/api/auth/logout' },
]

export default defineEventHandler((event) => {
  const path = getRoutePath(event)

  if (!isWriteRequest(event) || !path.startsWith('/api/')) {
    return
  }

  if (ALLOWED_WRITES.some(allowed => allowed.method === event.method && allowed.path === path)) {
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
