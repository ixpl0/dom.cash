import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { emailVerificationCode, user, session } from '~~/server/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { hashPassword } from '~~/server/utils/auth'
import { useDatabase } from '~~/server/db'
import { emailSchema } from '~~/server/schemas/auth'

const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().length(6),
  newPassword: z.string().min(8).max(100),
})

const throwInvalidCodeError = (): never => {
  throw createError({
    statusCode: 400,
    message: 'Invalid or expired verification code',
  })
}

export default defineEventHandler(async (event) => {
  const { email, code, newPassword } = await parseBody(event, resetPasswordSchema)
  const db = useDatabase(event)
  const now = new Date()

  const verificationRecord = await db.query.emailVerificationCode.findFirst({
    where: and(
      eq(emailVerificationCode.email, email),
      eq(emailVerificationCode.code, code),
      gt(emailVerificationCode.expiresAt, now),
    ),
  })

  if (!verificationRecord) {
    return throwInvalidCodeError()
  }

  const existingUser = await db.query.user.findFirst({
    where: eq(user.username, email),
  })

  if (!existingUser) {
    return throwInvalidCodeError()
  }

  const passwordHash = await hashPassword(newPassword)

  await db
    .update(user)
    .set({ passwordHash })
    .where(eq(user.username, email))

  await db
    .delete(session)
    .where(eq(session.userId, existingUser.id))

  await db
    .delete(emailVerificationCode)
    .where(eq(emailVerificationCode.email, email))

  return { success: true }
})
