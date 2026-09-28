import { requireAuth } from '~~/server/utils/session'
import { listConnections } from '~~/server/services/connections'
import type { TodoConnection } from '~~/shared/types/todo'

export default defineEventHandler(async (event): Promise<TodoConnection[]> => {
  const currentUser = await requireAuth(event)
  return listConnections(currentUser.id, event)
})
