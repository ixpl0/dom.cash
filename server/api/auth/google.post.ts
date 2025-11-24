import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { parseBody } from '~~/server/utils/validation'
import { verifyGoogleToken } from '~~/server/utils/google-oauth'
import { findUserByGoogleId, createGoogleUser, createSession, setAuthCookie, findUser } from '~~/server/utils/auth'
import { useDatabase } from '~~/server/db'
import { user } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

const googleAuthSchema = z.object({
  token: z.string().min(1, 'Google ID token is required'),
  mainCurrency: z.string().regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter uppercase code').optional().default('USD'),
})

export default defineEventHandler(async (event) => {
  const { token } = await parseBody(event, googleAuthSchema)

  try {
    const googleUserInfo = await verifyGoogleToken(token)
    const now = new Date()

    let authenticatedUser = await findUserByGoogleId(googleUserInfo.id, event)

    if (!authenticatedUser) {
      const existingUserByEmail = await findUser(googleUserInfo.email, event)

      if (existingUserByEmail) {
        if (existingUserByEmail.passwordHash) {
          throw createError({
            statusCode: 409,
            message: 'Account already exists with password. Please sign in with your password first.',
          })
        }
        else {
          const database = useDatabase(event)
          await database
            .update(user)
            .set({ googleId: googleUserInfo.id })
            .where(eq(user.id, existingUserByEmail.id))

          authenticatedUser = { ...existingUserByEmail, googleId: googleUserInfo.id }
        }
      }
      else {
        authenticatedUser = await createGoogleUser(
          googleUserInfo.email,
          googleUserInfo.id,
          event,
        )
      }
    }

    if (!authenticatedUser) {
      throw createError({
        statusCode: 500,
        message: 'Failed to authenticate user',
      })
    }

    const sessionToken = await createSession(authenticatedUser.id, now, event)
    setAuthCookie(event, sessionToken)

    return {
      id: authenticatedUser.id,
      username: authenticatedUser.username,
      mainCurrency: authenticatedUser.mainCurrency,
      isAdmin: authenticatedUser.isAdmin,
    }
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 401,
      message: 'Google authentication failed',
    })
  }
})
