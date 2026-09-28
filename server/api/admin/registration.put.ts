import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { updateRegistration } from '~~/server/services/auth/registration'
import { registrationUpdateSchema } from '~~/shared/schemas/auth'
import type { RegistrationState } from '~~/shared/types'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<RegistrationState> => {
  const currentUser = await requireAuth(event)

  if (!currentUser.isAdmin) {
    throw createError({ statusCode: 403, message: ERROR_KEYS.FORBIDDEN })
  }

  const { mode } = await parseBody(event, registrationUpdateSchema)

  return updateRegistration(event, mode, new Date())
})
