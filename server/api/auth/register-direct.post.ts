import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { user } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { createSession, setAuthCookie, hashPassword, createUserInDb } from '~~/server/utils/auth'
import { useDatabase } from '~~/server/db'
import { emailSchema } from '~~/shared/schemas/auth'
import { isEmailVerificationDisabled } from '~~/server/utils/feature-flags'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
})

export default defineEventHandler(async (event) => {
  if (!isEmailVerificationDisabled()) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.DIRECT_REGISTRATION_DISABLED,
    })
  }

  const { email, password } = await parseBody(event, registerSchema)
  const db = useDatabase(event)
  const now = new Date()

  const existingUser = await db.query.user.findFirst({
    where: eq(user.username, email),
  })

  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.USER_ALREADY_EXISTS,
    })
  }

  const passwordHash = await hashPassword(password)

  const newUser = await createUserInDb(
    event,
    { username: email, passwordHash },
  )

  const token = await createSession(newUser.id, now, event)
  setAuthCookie(event, token)

  return {
    id: newUser.id,
    username: newUser.username,
    mainCurrency: newUser.mainCurrency,
    isAdmin: newUser.isAdmin,
  }
})
