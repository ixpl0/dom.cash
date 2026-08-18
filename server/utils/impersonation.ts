import { deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { user } from '~~/server/db/schema'
import type { User } from '~~/shared/types'

export const IMPERSONATION_COOKIE = 'impersonation-user-id'

export const setImpersonationCookie = (event: H3Event, userId: string): void => {
  const isProduction = process.env.NODE_ENV === 'production'

  setCookie(event, IMPERSONATION_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
  })
}

export const clearImpersonationCookie = (event: H3Event): void => {
  deleteCookie(event, IMPERSONATION_COOKIE, {
    path: '/',
  })
}

export const resolveImpersonation = async (event: H3Event, requester: User): Promise<User | null> => {
  const targetUserId = getCookie(event, IMPERSONATION_COOKIE)

  if (!targetUserId) {
    return null
  }

  if (!requester.isAdmin || targetUserId === requester.id) {
    clearImpersonationCookie(event)
    return null
  }

  const db = useDatabase(event)
  const [targetUser] = await db
    .select({
      id: user.id,
      username: user.username,
      mainCurrency: user.mainCurrency,
      isAdmin: user.isAdmin,
    })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1)

  if (!targetUser) {
    clearImpersonationCookie(event)
    return null
  }

  return {
    ...targetUser,
    impersonatedBy: requester.username,
  }
}
