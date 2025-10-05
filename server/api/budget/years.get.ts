import { getQuery, createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { getAvailableYears, getInitialYearsToLoad, findUserByUsername } from '~~/server/services/months'
import { checkReadPermission } from '~~/server/services/users'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const querySchema = z.object({
    username: z.string().optional(),
  })
  const parsed = querySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid query parameters',
    })
  }

  const targetUsername = parsed.data.username

  let targetUserId = user.id

  if (targetUsername) {
    const targetUser = await findUserByUsername(targetUsername, event)
    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: 'User not found',
      })
    }
    targetUserId = targetUser.id

    const hasReadPermission = await checkReadPermission(targetUserId, user.id, event)
    if (!hasReadPermission) {
      throw createError({
        statusCode: 403,
        message: 'Insufficient permissions to view budget',
      })
    }
  }

  const availableYears = await getAvailableYears(targetUserId, event)
  const initialYears = getInitialYearsToLoad(availableYears)

  return {
    availableYears,
    initialYears,
  }
})
