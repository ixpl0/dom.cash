import { requireAuth } from '~~/server/utils/session'
import { getUserBudgetData } from '~~/server/services/users'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const username = getRouterParam(event, 'username')

  if (!username) {
    throw createError({
      statusCode: 400,
      message: 'Username is required',
    })
  }

  try {
    return await getUserBudgetData(username, user.id, event)
  }
  catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        throw createError({
          statusCode: 404,
          message: 'User not found',
        })
      }
      if (error.message === 'Insufficient permissions to view budget') {
        throw createError({
          statusCode: 403,
          message: 'Insufficient permissions to view budget',
        })
      }
    }
    throw error
  }
})
