import { getUserFromRequest } from '~~/server/utils/auth'
import { subscribeToBudget } from '~~/server/services/notifications'
import { checkReadPermission } from '~~/server/services/users'

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

  const hasAccess = await checkReadPermission(budgetOwnerId, user.id, event)
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: 'No access to this budget',
    })
  }

  subscribeToBudget(user.id, budgetOwnerId)

  return { success: true }
})
