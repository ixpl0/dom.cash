import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { createTodo } from '~~/server/services/todo'
import { createTodoSchema } from '~~/shared/schemas/todo'
import type { TodoListItem } from '~~/shared/types/todo'

export default defineEventHandler(async (event): Promise<TodoListItem> => {
  const currentUser = await requireAuth(event)
  const payload = await parseBody(event, createTodoSchema)
  return createTodo(currentUser, payload, event)
})
