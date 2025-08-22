import { getUserFromRequest } from '~~/server/utils/auth'
import { unsubscribeFromBudget } from '~~/server/services/notifications'

export default defineEventHandler(async (event) => {
  const user = await getUserFromRequest(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const body = await readBody(event)
  const { budgetOwnerId } = body

  if (!budgetOwnerId) {
    throw createError({
      statusCode: 400,
      message: 'budgetOwnerId is required',
    })
  }

  unsubscribeFromBudget(user.id, budgetOwnerId)

  return { success: true }
})
