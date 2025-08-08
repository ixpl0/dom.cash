import { defineEventHandler, createError } from 'h3'
import { validateAuthToken } from '~~/shared/utils/auth'

export default defineEventHandler(async (event) => {
  const { user, error } = await validateAuthToken(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: error || 'Authentication failed',
    })
  }

  return { user }
})
