import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { updateTodo } from '~~/server/services/todo'
import { recurrencePatternSchema } from '~~/shared/schemas/recurrence'
import type { TodoListItem } from '~~/shared/types/todo'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const updateTodoSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable().optional(),
  recurrence: recurrencePatternSchema.nullable().optional(),
  sharedWithUserIds: z.array(z.string()).optional(),
})

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
