import { requireAuth } from '~~/server/utils/session'
import { listTodos } from '~~/server/services/todo'
import type { TodoData } from '~~/shared/types/todo'

export default defineEventHandler(async (event): Promise<TodoData> => {
  const currentUser = await requireAuth(event)
  return { items: await listTodos(currentUser.id, event) }
})
