import { defineEventHandler } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { findUser } from '~~/server/utils/auth'
import { emailSchema } from '~~/shared/schemas/auth'
import {
  cleanupExpiredCodes,
  getExistingCode,
  checkAlreadySent,
  prepareVerificationCode,
  saveVerificationCode,
  VERIFICATION_CONFIG,
} from '~~/server/utils/verification'
import { sendVerificationEmail } from '~~/server/utils/email'

const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export default defineEventHandler(async (event) => {
  const { email } = await parseBody(event, forgotPasswordSchema)
  const now = new Date()
  const config = VERIFICATION_CONFIG.passwordReset

  await cleanupExpiredCodes(event)

  const existingUser = await findUser(email, event)

  if (!existingUser) {
    return { success: true, attemptCount: 0 }
  }

  const existingCode = await getExistingCode(event, email)

  const cooldownMinutes = config.cooldownMinutes ?? 60
  const alreadySentResult = checkAlreadySent(existingCode ?? undefined, now, cooldownMinutes)

  if (alreadySentResult.alreadySent) {
    return {
      success: false,
      alreadySent: true,
      waitMinutes: alreadySentResult.waitMinutes,
    }
  }

  const { code, expiresAt, attemptCount } = prepareVerificationCode(
    existingCode ?? undefined,
    config,
    now,
  )

  await saveVerificationCode({
    event,
    email,
    code,
    expiresAt,
    attemptCount,
    existingCode,
  })

  await sendVerificationEmail({
    event,
    to: email,
    code,
    template: 'reset-password',
  })

  return { success: true, alreadySent: false, attemptCount }
})
