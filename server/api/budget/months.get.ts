import { requireAuth } from '~~/server/utils/session'
import { getUserMonths } from '~~/server/services/months'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  return await getUserMonths(user.id, event)
})
