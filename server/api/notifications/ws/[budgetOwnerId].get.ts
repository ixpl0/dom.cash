import { createError } from 'h3'
import { getUserFromRequest } from '~~/server/utils/auth'
import { checkReadPermission } from '~~/server/services/users'

export default defineEventHandler(async (event) => {
  const user = await getUserFromRequest(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const budgetOwnerId = getRouterParam(event, 'budgetOwnerId')
  if (!budgetOwnerId) {
    throw createError({ statusCode: 400, message: 'Budget owner ID is required' })
  }

  const hasAccess = await checkReadPermission(budgetOwnerId, user.id, event)
  if (!hasAccess) {
    throw createError({ statusCode: 403, message: 'No access to this budget' })
  }

  const env = event.context.cloudflare?.env
  if (!env?.BUDGET_NOTIFICATIONS) {
    throw createError({ statusCode: 500, message: 'Notifications not available' })
  }

  const durableObjectId = env.BUDGET_NOTIFICATIONS.idFromName(budgetOwnerId)
  const stub = env.BUDGET_NOTIFICATIONS.get(durableObjectId)

  const upgradeHeader = event.node.req.headers.upgrade
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    throw createError({ statusCode: 426, message: 'Expected WebSocket upgrade' })
  }

  const response = await stub.fetch('https://do/websocket', {
    headers: {
      'Upgrade': 'websocket',
      'X-User-Id': user.id,
      'X-Username': user.username,
    },
  })

  return response
})
