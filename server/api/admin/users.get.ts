import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { useDatabase } from '~~/server/db'
import { user } from '~~/server/db/schema'
import { count, desc, asc, sql } from 'drizzle-orm'
import type { AdminUsersResponse } from '~~/shared/types'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 10
const ALLOWED_SORT_FIELDS = ['username', 'email', 'role', 'status', 'createdAt'] as const
const ALLOWED_SORT_ORDERS = ['asc', 'desc'] as const

const escapeLikePattern = (pattern: string): string => {
  return pattern.replace(/[%_\\]/g, '\\$&')
}

export default defineEventHandler(async (event): Promise<AdminUsersResponse> => {
  const currentUser = await requireAuth(event)
  if (!currentUser.isAdmin) {
    throw createError({ statusCode: 403, message: ERROR_KEYS.FORBIDDEN })
  }

  const query = getQuery(event)
  const rawPage = Number(query.page)
  const rawLimit = Number(query.limit)

  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= MAX_LIMIT
    ? rawLimit
    : DEFAULT_LIMIT
  const offset = (page - 1) * limit

  const search = (query.q as string || '').trim()
  const sortBy = (ALLOWED_SORT_FIELDS.includes(query.sortBy as typeof ALLOWED_SORT_FIELDS[number])
    ? query.sortBy
    : 'createdAt') as typeof ALLOWED_SORT_FIELDS[number]
  const sortOrder = (ALLOWED_SORT_ORDERS.includes(query.order as typeof ALLOWED_SORT_ORDERS[number])
    ? query.order
    : 'desc') as typeof ALLOWED_SORT_ORDERS[number]

  const db = useDatabase(event)

  const whereClause = search
    ? sql`${user.username} LIKE ${`%${escapeLikePattern(search)}%`} ESCAPE '\\'`
    : undefined

  let orderBy
  switch (sortBy) {
    case 'email':
    case 'username':
      orderBy = sortOrder === 'asc' ? asc(user.username) : desc(user.username)
      break
    case 'role':
      orderBy = sortOrder === 'asc' ? asc(user.isAdmin) : desc(user.isAdmin)
      break
    case 'status':
      orderBy = sortOrder === 'asc' ? asc(user.emailVerified) : desc(user.emailVerified)
      break
    case 'createdAt':
    default:
      orderBy = sortOrder === 'asc' ? asc(user.createdAt) : desc(user.createdAt)
  }

  const [users, totalResult] = await Promise.all([
    db.select({
      id: user.id,
      username: user.username,
      emailVerified: user.emailVerified,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    })
      .from(user)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(orderBy),
    db.select({ count: count() }).from(user).where(whereClause),
  ])

  return {
    users,
    total: totalResult[0]?.count || 0,
    page,
    limit,
  }
})
