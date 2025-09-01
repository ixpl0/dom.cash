import { requireAuth } from '~~/server/utils/session'
import { getAvailableYears, getInitialYearsToLoad, findUserByUsername } from '~~/server/services/months'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const targetUsername = query.username as string | undefined

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
