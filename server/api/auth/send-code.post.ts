import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { user } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { emailSchema } from '~~/server/schemas/auth'
import {
  cleanupExpiredCodes,
  getExistingCode,
  checkAlreadySent,
  prepareVerificationCode,
  saveVerificationCode,
  VERIFICATION_CONFIG,
} from '~~/server/utils/verification'
import { sendVerificationEmail } from '~~/server/utils/email'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const sendCodeSchema = z.object({
  email: emailSchema,
})

export default defineEventHandler(async (event) => {
  const { email } = await parseBody(event, sendCodeSchema)
  const db = useDatabase(event)
  const now = new Date()
  const config = VERIFICATION_CONFIG.registration

  await cleanupExpiredCodes(event)

  const existingUser = await db.query.user.findFirst({
    where: eq(user.username, email),
  })

  if (existingUser) {
    throw createError({ statusCode: 400, message: ERROR_KEYS.USER_ALREADY_EXISTS })
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
    template: 'verification',
  })

  return { success: true, alreadySent: false, attemptCount }
})
