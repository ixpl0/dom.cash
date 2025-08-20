import { defineEventHandler } from 'h3'
import { authSchema } from '~~/server/schemas/auth'
import { ensureUser, createSession, setAuthCookie } from '~~/server/utils/auth'
import { parseBody } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const { username, password, mainCurrency } = await parseBody(event, authSchema)
  const now = new Date()
  const authenticatedUser = await ensureUser(username, password, mainCurrency, now, event)
  const token = await createSession(authenticatedUser.id, now, event)

  setAuthCookie(event, token)

  return {
    id: authenticatedUser.id,
    username: authenticatedUser.username,
    mainCurrency: authenticatedUser.mainCurrency,
  }
})
