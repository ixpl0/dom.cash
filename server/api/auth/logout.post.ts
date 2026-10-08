import { defineEventHandler, getCookie, deleteCookie, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { session } from '~~/server/db/schema'
import { hashToken } from '~~/server/utils/crypto'
import { clearImpersonationCookie } from '~~/server/utils/impersonation'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth-token')

  if (token) {
    try {
      const db = useDatabase(event)
      await db.delete(session).where(eq(session.tokenHash, hashToken(token)))
    }
    catch (error) {
      secureLog.error('Database error during logout:', error)
      throw createError({
        statusCode: 500,
        message: ERROR_KEYS.LOGOUT_ERROR,
      })
    }
  }

  deleteCookie(event, 'auth-token', {
    path: '/',
  })
  clearImpersonationCookie(event)

  return { success: true }
})
