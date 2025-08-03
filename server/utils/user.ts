import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db } from '~~/server/db'
import { session, user } from '~~/server/db/schema'
import { verifyJWT } from '~~/server/utils/auth'

export const getCurrentUser = async (event: H3Event) => {
  let token: string | undefined

  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  } else {
    token = getCookie(event, 'auth-token')
  }

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Токен не предоставлен',
    })
  }

  const decoded = verifyJWT(token)

  if (!decoded) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Недействительный токен',
    })
  }

  const sessionData = await db
    .select({
      userId: session.userId,
      username: user.username,
      id: user.id,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(eq(session.token, token))
    .limit(1)

  if (!sessionData.length) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Сессия не найдена',
    })
  }

  return sessionData[0]
}
