import { defineEventHandler } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { user } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { emailSchema } from '~~/server/schemas/auth'
import {
  cleanupExpiredCodes,
  getExistingCode,
  checkRateLimit,
  throwRateLimitError,
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
  const db = useDatabase(event)
  const now = new Date()
  const config = VERIFICATION_CONFIG.passwordReset

  await cleanupExpiredCodes(event)

  const existingUser = await db.query.user.findFirst({
    where: eq(user.username, email),
  })

  if (!existingUser) {
    return { success: true, attemptCount: 0 }
  }

  const existingCode = await getExistingCode(event, email)

  const rateLimitResult = checkRateLimit(existingCode ?? undefined, config, now)

  if (!rateLimitResult.allowed) {
    throwRateLimitError(rateLimitResult)
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

  return { success: true, attemptCount }
})
