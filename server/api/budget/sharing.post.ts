import { requireAuth } from '~~/server/utils/session'
import { createShare } from '~~/server/services/sharing'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  try {
    return await createShare({
      ownerId: user.id,
      sharedWithUsername: body.sharedWithUsername,
      access: body.access,
    })
  }
  catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        throw createError({
          statusCode: 404,
          statusMessage: 'User not found',
        })
      }
      if (error.message === 'Cannot share with yourself') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Cannot share with yourself',
        })
      }
      if (error.message === 'Budget already shared with this user') {
        throw createError({
          statusCode: 409,
          statusMessage: 'Budget already shared with this user',
        })
      }
    }
    throw error
  }
})
