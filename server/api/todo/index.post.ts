import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { createTodo } from '~~/server/services/todo'
import { recurrencePatternSchema } from '~~/shared/schemas/recurrence'
import type { TodoListItem } from '~~/shared/types/todo'

const createTodoSchema = z.object({
  content: z.string().min(1).max(10000),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).optional(),
  recurrence: recurrencePatternSchema.nullable().optional(),
  sharedWithUserIds: z.array(z.string()).optional(),
})

export default defineEventHandler(async (event): Promise<TodoListItem> => {
  const currentUser = await requireAuth(event)
  const payload = await parseBody(event, createTodoSchema)
  return createTodo(currentUser, payload, event)
})
