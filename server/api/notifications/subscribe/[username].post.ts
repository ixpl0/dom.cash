import { createError, getRouterParam } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { subscribeToBudget } from '~~/server/services/notifications'
import { resolveBudget } from '~~/server/services/budget/access'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  const username = getRouterParam(event, 'username')
  if (!username) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.USERNAME_REQUIRED,
    })
  }

  const { owner } = await resolveBudget(event, currentUser, username, 'read', ERROR_KEYS.NO_ACCESS_TO_BUDGET)

  subscribeToBudget(currentUser.id, owner.id)

  return { success: true }
})
