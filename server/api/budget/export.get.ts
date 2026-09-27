import { getQuery, isError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { exportBudget } from '~~/server/services/budget/import-export'
import { checkReadPermission, findUserByUsername } from '~~/server/services/auth/users'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const exportQuerySchema = z.object({
  username: z.string().min(1).optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)

  const parsedQuery = exportQuerySchema.safeParse(getQuery(event))
  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.INVALID_QUERY_PARAMETERS,
    })
  }

  const { username } = parsedQuery.data
  const owner = username ? await findUserByUsername(username, event) : null

  if (username && !owner) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.USER_NOT_FOUND,
    })
  }

  const ownerId = owner?.id ?? currentUser.id
  const hasReadAccess = await checkReadPermission(ownerId, currentUser.id, event)

  if (!hasReadAccess) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.ACCESS_DENIED,
    })
  }

  try {
    const exportData = await exportBudget(ownerId, event)

    setHeader(event, 'Content-Type', 'application/json')

    return exportData
  }
  catch (error) {
    if (isError(error)) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_EXPORT_BUDGET,
    })
  }
})
