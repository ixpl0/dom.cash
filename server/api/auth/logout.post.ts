import { defineEventHandler, getCookie, deleteCookie, createError } from 'h3'
import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { session } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth-token')

  if (token) {
    try {
      const tokenHash = createHash('sha256').update(token).digest('hex')
      const db = useDatabase(event)
      await db.delete(session).where(eq(session.tokenHash, tokenHash))
    }
    catch (error) {
      console.error('Database error during logout:', error)
      throw createError({
        statusCode: 500,
        message: 'Internal server error during logout',
      })
    }
  }

  deleteCookie(event, 'auth-token', {
    path: '/',
  })

  return { success: true }
})
