import { getQuery, createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { getAvailableYears, getInitialYearsToLoad, findUserByUsername } from '~~/server/services/months'

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
  }

  const availableYears = await getAvailableYears(targetUserId, event)
  const initialYears = getInitialYearsToLoad(availableYears)

  return {
    availableYears,
    initialYears,
  }
})
