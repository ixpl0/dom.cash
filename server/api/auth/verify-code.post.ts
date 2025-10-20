import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { emailVerificationCode, user } from '~~/server/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { createSession, setAuthCookie, hashPassword } from '~~/server/utils/auth'
import { useDatabase } from '~~/server/db'

const verifyCodeSchema = z.object({
  email: z
    .string()
    .min(3)
    .max(64)
    .trim()
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9+._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/,
      'Invalid email format',
    ),
  code: z.string().length(6),
  password: z.string().min(8).max(100),
  mainCurrency: z.string().length(3),
})

export default defineEventHandler(async (event) => {
  const { email, code, password, mainCurrency } = await parseBody(event, verifyCodeSchema)
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

  const [newUser] = await db
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      username: email,
      passwordHash,
      mainCurrency,
      createdAt: now,
    })
    .returning()

  if (!newUser) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create user',
    })
  }

  await db
    .delete(emailVerificationCode)
    .where(eq(emailVerificationCode.email, email))

  const token = await createSession(newUser.id, now, event)
  setAuthCookie(event, token)

  return {
    id: newUser.id,
    username: newUser.username,
    mainCurrency: newUser.mainCurrency,
  }
})
