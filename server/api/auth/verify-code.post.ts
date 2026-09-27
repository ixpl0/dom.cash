import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { createSession, setAuthCookie, hashPassword, createUserInDb, findUser } from '~~/server/utils/auth'
import { emailSchema } from '~~/shared/schemas/auth'
import { verifyCode, throwVerifyCodeError, deleteVerificationCode, VERIFICATION_CONFIG } from '~~/server/utils/verification'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const verifyCodeSchema = z.object({
  email: emailSchema,
  code: z.string().length(6),
  password: z.string().min(8).max(100),
})

export default defineEventHandler(async (event) => {
  const { email, code, password } = await parseBody(event, verifyCodeSchema)

  const existingUser = await findUser(email, event)

  if (existingUser) {
    throw createError({
      statusCode: 409,
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
