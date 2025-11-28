import { requireAuth } from '~~/server/utils/session'
import { getUserBudgetData } from '~~/server/services/users'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const username = getRouterParam(event, 'username')

  if (!username) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.USERNAME_REQUIRED,
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
          message: ERROR_KEYS.USER_NOT_FOUND,
        })
      }
      if (error.message === 'Insufficient permissions to view budget') {
        throw createError({
          statusCode: 403,
          message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_VIEW,
        })
      }
    }
    throw error
  }
})
