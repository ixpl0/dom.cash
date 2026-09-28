import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { getRegistrationState } from '~~/server/services/auth/registration'
import type { RegistrationState } from '~~/shared/types'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<RegistrationState> => {
  const currentUser = await requireAuth(event)

  if (!currentUser.isAdmin) {
    throw createError({ statusCode: 403, message: ERROR_KEYS.FORBIDDEN })
  }

  return getRegistrationState(event, new Date())
})
