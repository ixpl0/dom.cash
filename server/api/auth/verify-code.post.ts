import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { emailVerificationCode, user } from '~~/server/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { createSession, setAuthCookie, hashPassword, createUserInDb } from '~~/server/utils/auth'
import { useDatabase } from '~~/server/db'
import { emailSchema } from '~~/server/schemas/auth'

const verifyCodeSchema = z.object({
  email: emailSchema,
  code: z.string().length(6),
  password: z.string().min(8).max(100),
})

export default defineEventHandler(async (event) => {
  const { email, code, password } = await parseBody(event, verifyCodeSchema)
  const db = useDatabase(event)
  const now = new Date()

  const existingUser = await db.query.user.findFirst({
    where: eq(user.username, email),
  })

  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: 'User already exists',
    })
  }

  const verificationRecord = await db.query.emailVerificationCode.findFirst({
    where: and(
      eq(emailVerificationCode.email, email),
      eq(emailVerificationCode.code, code),
      gt(emailVerificationCode.expiresAt, now),
    ),
  })

  if (!verificationRecord) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired verification code',
    })
  }

  const passwordHash = await hashPassword(password)

  const newUser = await createUserInDb(
    event,
    { username: email, passwordHash, emailVerified: true },
  )

  await db
    .delete(emailVerificationCode)
    .where(eq(emailVerificationCode.email, email))

  const token = await createSession(newUser.id, now, event)
  setAuthCookie(event, token)

  return {
    id: newUser.id,
    username: newUser.username,
    mainCurrency: newUser.mainCurrency,
    isAdmin: newUser.isAdmin,
  }
})
