import { defineEventHandler, getQuery, getHeader, createError } from 'h3'
import { z } from 'zod'
import { verifyGoogleToken } from '~~/server/utils/google-oauth'
import { findUserByGoogleId, createGoogleUser, createSession, setAuthCookie, findUser } from '~~/server/utils/auth'
import { useDatabase } from '~~/server/db'
import { user } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

type GoogleTokenResponse = {
  access_token?: string
  expires_in?: number
  id_token?: string
  scope?: string
  token_type?: string
  refresh_token?: string
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const querySchema = z.object({
    code: z.string().min(1),
    state: z.string().optional(),
  })
  const parsed = querySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing authorization code',
    })
  }
  const { code, state } = parsed.data

  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Google OAuth not configured',
      })
    }

    const origin = getHeader(event, 'origin') || getHeader(event, 'referer')?.replace(/\/.*$/, '')
    const redirectUri = `${origin}/auth`

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to exchange authorization code',
      })
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json()
    const { id_token } = tokens

    if (!id_token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No ID token received',
      })
    }

    const googleUserInfo = await verifyGoogleToken(id_token)

    const now = new Date()
    const mainCurrency = 'USD'

    let authenticatedUser = await findUserByGoogleId(googleUserInfo.id, event)

    if (!authenticatedUser) {
      const existingUserByEmail = await findUser(googleUserInfo.email, event)

      if (existingUserByEmail) {
        if (existingUserByEmail.passwordHash) {
          throw createError({
            statusCode: 409,
            statusMessage: 'Account already exists with password. Please sign in with your password first.',
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
          mainCurrency,
          now,
          event,
        )
      }
    }

    if (!authenticatedUser) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to authenticate user',
      })
    }

    const sessionToken = await createSession(authenticatedUser.id, now, event)
    setAuthCookie(event, sessionToken)

    return {
      user: {
        id: authenticatedUser.id,
        username: authenticatedUser.username,
        mainCurrency: authenticatedUser.mainCurrency,
      },
      redirectTo: state || '/',
    }
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Google authentication failed',
    })
  }
})
