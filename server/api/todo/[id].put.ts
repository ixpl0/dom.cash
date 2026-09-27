import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { updateTodo } from '~~/server/services/todo'
import { updateTodoSchema } from '~~/shared/schemas/todo'
import type { TodoListItem } from '~~/shared/types/todo'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<TodoListItem> => {
  const currentUser = await requireAuth(event)

  const todoId = getRouterParam(event, 'id')
  if (!todoId) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.TODO_ID_REQUIRED,
    })
  }

  const payload = await parseBody(event, updateTodoSchema)
  return updateTodo(currentUser, todoId, payload, event)
})
