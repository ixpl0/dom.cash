import { requireAuth } from '~~/server/utils/session'
import { getUserMonths } from '~~/server/services/months'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const months = await getUserMonths(user.id, event)

  return {
    user: {
      username: user.username,
      mainCurrency: user.mainCurrency,
    },
    access: 'owner' as const,
    months,
  }
})
