import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { user, session } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '~~/server/utils/auth'
import { useDatabase } from '~~/server/db'
import { emailSchema } from '~~/server/schemas/auth'
import { verifyCode, throwVerifyCodeError, deleteVerificationCode, VERIFICATION_CONFIG } from '~~/server/utils/verification'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().length(6),
  newPassword: z.string().min(8).max(100),
})

export default defineEventHandler(async (event) => {
  const { email, code, newPassword } = await parseBody(event, resetPasswordSchema)
  const db = useDatabase(event)

  const verifyResult = await verifyCode({
    event,
    email,
    code,
    config: VERIFICATION_CONFIG.passwordReset,
  })

  if (!verifyResult.valid) {
    return throwVerifyCodeError(verifyResult.reason)
  }

  const existingUser = await db.query.user.findFirst({
    where: eq(user.username, email),
  })

  if (!existingUser) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.INVALID_VERIFICATION_CODE,
    })
  }

  const passwordHash = await hashPassword(newPassword)

  await db
    .update(user)
    .set({ passwordHash })
    .where(eq(user.username, email))

  await db
    .delete(session)
    .where(eq(session.userId, existingUser.id))

  await deleteVerificationCode(event, email)

  return { success: true }
})
