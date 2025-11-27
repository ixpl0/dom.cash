import { getUserFromRequest } from '~~/server/utils/auth'
import { subscribeToBudget } from '~~/server/services/notifications'
import { findUserByUsername, checkReadPermission } from '~~/server/services/users'

export default defineEventHandler(async (event) => {
  const user = await getUserFromRequest(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const username = getRouterParam(event, 'username')
  if (!username) {
    throw createError({
      statusCode: 400,
      message: 'Username is required',
    })
  }

  const targetUser = await findUserByUsername(username, event)
  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  const hasAccess = await checkReadPermission(targetUser.id, user.id, event)
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: 'No access to this budget',
    })
  }

  subscribeToBudget(user.id, targetUser.id)

  return { success: true }
})
