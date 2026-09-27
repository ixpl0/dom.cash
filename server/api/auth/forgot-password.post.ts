import { defineEventHandler } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { findUser } from '~~/server/utils/auth'
import { requestVerificationCode } from '~~/server/utils/verification'
import { emailSchema } from '~~/shared/schemas/auth'
import type { CodeRequestResult } from '~~/shared/types'

const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export default defineEventHandler(async (event): Promise<CodeRequestResult> => {
  const { email } = await parseBody(event, forgotPasswordSchema)

  if (!await findUser(email, event)) {
    return { alreadySent: false }
  }

  return requestVerificationCode(event, email, 'passwordReset')
})
