import { requireAuth } from '~~/server/utils/session'
import { toggleTodo } from '~~/server/services/todo'
import type { ToggleResult } from '~~/shared/types/todo'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<ToggleResult> => {
  const currentUser = await requireAuth(event)

  const todoId = getRouterParam(event, 'id')
  if (!todoId) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.TODO_ID_REQUIRED,
    })
  }

  return toggleTodo(currentUser, todoId, event)
})
