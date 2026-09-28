import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { createSession, setAuthCookie, hashPassword, createUserInDb, findUser } from '~~/server/utils/auth'
import { emailSchema, passwordSchema, verificationCodeSchema } from '~~/shared/schemas/auth'
import { verifyCode, throwVerifyCodeError, VERIFICATION_CONFIG } from '~~/server/utils/verification'
import { assertRegistrationOpen } from '~~/server/services/auth/registration'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const verifyCodeSchema = z.object({
  email: emailSchema,
  code: verificationCodeSchema,
  password: passwordSchema,
})

export default defineEventHandler(async (event) => {
  const { email, code, password } = await parseBody(event, verifyCodeSchema)

  await assertRegistrationOpen(event)

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

  const token = await createSession(newUser.id, new Date(), event)
  setAuthCookie(event, token)

  return {
    id: newUser.id,
    username: newUser.username,
    mainCurrency: newUser.mainCurrency,
    isAdmin: newUser.isAdmin,
  }
})
