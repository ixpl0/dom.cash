import { getUserFromRequest } from '~~/server/utils/auth'
import { createNotification } from '~~/server/services/notifications'

export default defineEventHandler(async (event) => {
  const user = await getUserFromRequest(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const body = await readBody(event)
  const { targetUserId, message } = body

  if (!targetUserId || !message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'targetUserId and message are required',
    })
  }

  await createNotification({
    sourceUserId: user.id,
    budgetOwnerId: targetUserId,
    type: 'budget_entry_created',
    message,
  })

  return { success: true }
})
