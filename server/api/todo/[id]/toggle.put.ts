import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { toggleTodo } from '~~/server/services/todo'
import { dateReferenceSchema } from '~~/shared/schemas/recurrence'
import type { ToggleResult } from '~~/shared/types/todo'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const toggleTodoSchema = z.object({
  reference: dateReferenceSchema.optional(),
})

export default defineEventHandler(async (event): Promise<ToggleResult> => {
  const currentUser = await requireAuth(event)

  const todoId = getRouterParam(event, 'id')
  if (!todoId) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.TODO_ID_REQUIRED,
    })
  }

  const { reference } = await parseBody(event, toggleTodoSchema.default({}))
  return toggleTodo(currentUser, todoId, reference, event)
})
