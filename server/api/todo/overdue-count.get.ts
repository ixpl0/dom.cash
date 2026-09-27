import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseQuery } from '~~/server/utils/validation'
import { countOverdueTodos } from '~~/server/services/todo'
import type { OverdueTodoCount } from '~~/shared/types/todo'

const querySchema = z.object({
  today: z.iso.date(),
})

export default defineEventHandler(async (event): Promise<OverdueTodoCount> => {
  const currentUser = await requireAuth(event)
  const { today } = parseQuery(event, querySchema)
  return { count: await countOverdueTodos(currentUser.id, today, event) }
})
