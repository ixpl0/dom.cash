import { getUserFromRequest } from '~~/server/utils/auth'
import { unsubscribeFromBudget } from '~~/server/services/notifications'
import { findUserByUsername } from '~~/server/services/users'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  const user = await getUserFromRequest(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  const username = getRouterParam(event, 'username')
  if (!username) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.USERNAME_REQUIRED,
    })
  }

  const targetUser = await findUserByUsername(username, event)
  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.USER_NOT_FOUND,
    })
  }

  unsubscribeFromBudget(user.id, targetUser.id)

  return { success: true }
})
