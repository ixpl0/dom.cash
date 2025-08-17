import { getUserNotifications } from '~~/server/services/notifications'
import { getUserFromRequest } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromRequest(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const notifications = await getUserNotifications(user.id)

  return {
    notifications,
  }
})
