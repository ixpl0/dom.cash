import { defineEventHandler } from 'h3'
import { authSchema } from '~~/server/schemas/auth'
import { ensureUser, createSession, setAuthCookie } from '~~/server/utils/auth'
import { parseBody } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const { username, password, mainCurrency } = await parseBody(event, authSchema)
  const now = new Date()
  const authenticatedUser = await ensureUser(username, password, mainCurrency, now)
  const { token, expiresAt } = await createSession(authenticatedUser.id, now)

  setAuthCookie(event, token)

  return {
    user: {
      id: authenticatedUser.id,
      username: authenticatedUser.username,
      mainCurrency: authenticatedUser.mainCurrency,
    },
    token,
    expiresAt,
  }
})
