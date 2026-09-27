import { createError, getRouterParam } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { unsubscribeFromBudget } from '~~/server/services/notifications'
import { findUser } from '~~/server/utils/auth'
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

  const targetUser = await findUser(username, event)
  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.USER_NOT_FOUND,
    })
  }

  unsubscribeFromBudget(user.id, targetUser.id)

  return { success: true }
})
