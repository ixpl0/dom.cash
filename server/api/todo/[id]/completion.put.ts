import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { parseBody } from '~~/server/utils/validation'
import { setTodoCompletion } from '~~/server/services/todo'
import { todoCompletionSchema } from '~~/shared/schemas/todo'
import type { TodoListItem } from '~~/shared/types/todo'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<TodoListItem> => {
  const currentUser = await requireAuth(event)
  const todoId = requireRouterParam(event, 'id', ERROR_KEYS.TODO_ID_REQUIRED)
  const payload = await parseBody(event, todoCompletionSchema)
  return setTodoCompletion(currentUser, todoId, payload, event)
})
