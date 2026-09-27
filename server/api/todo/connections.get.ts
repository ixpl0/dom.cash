import { requireAuth } from '~~/server/utils/session'
import { listTodoConnections } from '~~/server/services/todo'
import type { TodoConnection } from '~~/shared/types/todo'

export default defineEventHandler(async (event): Promise<TodoConnection[]> => {
  const currentUser = await requireAuth(event)
  return listTodoConnections(currentUser.id, event)
})
