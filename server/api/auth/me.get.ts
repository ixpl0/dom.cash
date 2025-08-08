import { defineEventHandler, getCookie, createError } from 'h3'
import { createHash } from 'node:crypto'
import { eq, and, gt } from 'drizzle-orm'
import { db } from '~~/server/db'
import { user, session } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth-token')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'No token provided' })
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const now = new Date()

  const [userRecord] = await db
    .select({
      id: user.id,
      username: user.username,
      mainCurrency: user.mainCurrency,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(and(
      eq(session.tokenHash, tokenHash),
      gt(session.expiresAt, now),
    ))
    .limit(1)

  if (!userRecord) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  return {
    user: userRecord,
  }
})
