import type { H3Event } from 'h3'
import { createError } from 'h3'
import { validateAuthToken } from '~~/server/utils/auth-validation'
import type { User } from '~~/shared/types'

export const requireAuth = async (event: H3Event): Promise<User> => {
  const { user, error } = await validateAuthToken(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: error || 'Authentication required',
    })
  }

  return user
}

export const getOptionalAuth = async (event: H3Event): Promise<User | null> => {
  const { user } = await validateAuthToken(event)
  return user
}
