import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { findUser } from '~~/server/utils/auth'
import { requestVerificationCode } from '~~/server/utils/verification'
import { emailSchema } from '~~/shared/schemas/auth'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import type { CodeRequestResult } from '~~/shared/types'

const sendCodeSchema = z.object({
  email: emailSchema,
})

export default defineEventHandler(async (event): Promise<CodeRequestResult> => {
  const { email } = await parseBody(event, sendCodeSchema)

  if (await findUser(email, event)) {
    throw createError({ statusCode: 409, message: ERROR_KEYS.USER_ALREADY_EXISTS })
  }

  return requestVerificationCode(event, email, 'registration')
})
