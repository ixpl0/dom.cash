import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { createMonth, findUserByUsername, checkWritePermission } from '~~/server/services/months'

const createMonthSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(0).max(11),
  copyFromMonthId: z.string().optional(),
  targetUsername: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const { year, month: monthNumber, copyFromMonthId, targetUsername } = await parseBody(event, createMonthSchema)

  let targetUserId = currentUser.id

  if (targetUsername) {
    const targetUser = await findUserByUsername(targetUsername)
    if (!targetUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Target user not found',
      })
    }

    if (targetUser.id !== currentUser.id) {
      const hasPermission = await checkWritePermission(targetUser.id, currentUser.id)
      if (!hasPermission) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Insufficient permissions to create months',
        })
      }
    }

    targetUserId = targetUser.id
  }

  try {
    return await createMonth({
      year,
      month: monthNumber,
      copyFromMonthId,
      targetUserId,
    })
  }
  catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Month already exists') {
        throw createError({
          statusCode: 409,
          statusMessage: 'Month already exists',
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create month',
    })
  }
})
