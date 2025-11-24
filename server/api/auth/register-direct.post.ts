import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { user } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { createSession, setAuthCookie, hashPassword } from '~~/server/utils/auth'
import { useDatabase } from '~~/server/db'
import { emailSchema } from '~~/server/schemas/auth'
import { isEmailVerificationDisabled } from '~~/server/utils/feature-flags'

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
  mainCurrency: z.string().length(3),
})

export default defineEventHandler(async (event) => {
  if (!isEmailVerificationDisabled()) {
    throw createError({
      statusCode: 403,
      message: 'Direct registration is disabled. Use email verification instead.',
    })
  }

  const { email, password, mainCurrency } = await parseBody(event, registerSchema)
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

  const passwordHash = await hashPassword(password)

  const [newUser] = await db
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      username: email,
      passwordHash,
      mainCurrency,
      createdAt: now,
      emailVerified: false,
    })
    .returning()

  if (!newUser) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create user',
    })
  }

  const token = await createSession(newUser.id, now, event)
  setAuthCookie(event, token)

  return {
    id: newUser.id,
    username: newUser.username,
    mainCurrency: newUser.mainCurrency,
    isAdmin: newUser.isAdmin,
  }
})
