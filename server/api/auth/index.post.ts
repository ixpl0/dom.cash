import { defineEventHandler, createError } from 'h3'
import { authSchema } from '~~/server/schemas/auth'
import { findUser, createSession, setAuthCookie, verifyPassword } from '~~/server/utils/auth'
import { parseBody } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const { username, password } = await parseBody(event, authSchema)
  const now = new Date()
  const existing = await findUser(username, event)

  if (!existing) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  if (!existing.passwordHash) {
    throw createError({ statusCode: 401, message: 'Account exists with Google OAuth. Please use Google sign-in.' })
  }

  const isPasswordValid = await verifyPassword(password, existing.passwordHash)

  if (!isPasswordValid) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  const token = await createSession(existing.id, now, event)

  setAuthCookie(event, token)

  return {
    id: existing.id,
    username: existing.username,
    mainCurrency: existing.mainCurrency,
  }
})
