import { requireAuth } from '~~/server/utils/session'
import { getUserShares } from '~~/server/services/sharing'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  return await getUserShares(user.id, event)
})
