import { requireAuth } from '~~/server/utils/session'
import { deleteTodo } from '~~/server/services/todo'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  const todoId = getRouterParam(event, 'id')
  if (!todoId) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.TODO_ID_REQUIRED,
    })
  }

  await deleteTodo(currentUser, todoId, event)
  return { success: true }
})
