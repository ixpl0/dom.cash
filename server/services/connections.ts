import { eq } from 'drizzle-orm'
import { createError, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { budgetShare, user } from '~~/server/db/schema'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export interface Connection {
  id: string
  username: string
}

export const listConnections = async (userId: string, event: H3Event): Promise<Connection[]> =>
  useDatabase(event)
    .select({ id: user.id, username: user.username })
    .from(budgetShare)
    .innerJoin(user, eq(budgetShare.ownerId, user.id))
    .where(eq(budgetShare.sharedWithId, userId))

export const resolveConnections = async (ownerId: string, userIds: readonly string[], event: H3Event): Promise<Connection[]> => {
  const uniqueUserIds = new Set(userIds)

  if (uniqueUserIds.size === 0) {
    return []
  }

  const connections = (await listConnections(ownerId, event)).filter(connection => uniqueUserIds.has(connection.id))

  if (connections.length !== uniqueUserIds.size) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.INVALID_SHARED_USER,
    })
  }

  return connections
}
