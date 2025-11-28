import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { user } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { createSession, setAuthCookie, hashPassword, createUserInDb } from '~~/server/utils/auth'
import { useDatabase } from '~~/server/db'
import { emailSchema } from '~~/server/schemas/auth'
import { verifyCode, throwVerifyCodeError, deleteVerificationCode, VERIFICATION_CONFIG } from '~~/server/utils/verification'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const verifyCodeSchema = z.object({
  email: emailSchema,
  code: z.string().length(6),
  password: z.string().min(8).max(100),
})

export default defineEventHandler(async (event) => {
  const { email, code, password } = await parseBody(event, verifyCodeSchema)
  const db = useDatabase(event)

  const existingUser = await db.query.user.findFirst({
    where: eq(user.username, email),
  })

  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.USER_ALREADY_EXISTS,
    })
  }

  const verifyResult = await verifyCode({
    event,
    email,
    code,
    config: VERIFICATION_CONFIG.registration,
  })

  if (!verifyResult.valid) {
    return throwVerifyCodeError(verifyResult.reason)
  }

  const passwordHash = await hashPassword(password)

  const newUser = await createUserInDb(
    event,
    { username: email, passwordHash, emailVerified: true },
  )

  await deleteVerificationCode(event, email)

  const token = await createSession(newUser.id, new Date(), event)
  setAuthCookie(event, token)

  return {
    id: newUser.id,
    username: newUser.username,
    mainCurrency: newUser.mainCurrency,
    isAdmin: newUser.isAdmin,
  }
})
