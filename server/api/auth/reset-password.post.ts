import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { findUser, hashPassword } from '~~/server/utils/auth'
import { replaceUserPassword } from '~~/server/services/auth/users'
import { emailSchema, passwordSchema, verificationCodeSchema } from '~~/shared/schemas/auth'
import { verifyCode, throwVerifyCodeError, VERIFICATION_CONFIG } from '~~/server/utils/verification'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const resetPasswordSchema = z.object({
  email: emailSchema,
  code: verificationCodeSchema,
  newPassword: passwordSchema,
})

export default defineEventHandler(async (event) => {
  const { email, code, newPassword } = await parseBody(event, resetPasswordSchema)

  const verifyResult = await verifyCode({
    event,
    email,
    code,
    config: VERIFICATION_CONFIG.passwordReset,
  })

  if (!verifyResult.valid) {
    return throwVerifyCodeError(verifyResult.reason)
  }

  const existingUser = await findUser(email, event)

  if (!existingUser) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.INVALID_VERIFICATION_CODE,
    })
  }

  await replaceUserPassword(existingUser.id, await hashPassword(newPassword), event)

  return { success: true }
})
