import { defineEventHandler, createError } from 'h3'
import { authSchema } from '~~/server/schemas/auth'
import { findUser, createSession, setAuthCookie, verifyPassword } from '~~/server/utils/auth'
import { parseBody } from '~~/server/utils/validation'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  const { username, password } = await parseBody(event, authSchema)
  const now = new Date()
  const existing = await findUser(username, event)

  if (!existing) {
    throw createError({ statusCode: 401, message: ERROR_KEYS.INVALID_CREDENTIALS })
  }

  if (!existing.passwordHash) {
    throw createError({ statusCode: 401, message: ERROR_KEYS.ACCOUNT_EXISTS_GOOGLE })
  }

  const isPasswordValid = await verifyPassword(password, existing.passwordHash)

  if (!isPasswordValid) {
    throw createError({ statusCode: 401, message: ERROR_KEYS.INVALID_CREDENTIALS })
  }

  const token = await createSession(existing.id, now, event)

  setAuthCookie(event, token)

  return {
    id: existing.id,
    username: existing.username,
    mainCurrency: existing.mainCurrency,
    isAdmin: existing.isAdmin,
  }
})
