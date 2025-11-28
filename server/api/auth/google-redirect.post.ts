import { defineEventHandler, getQuery, getHeader, createError } from 'h3'
import { z } from 'zod'
import { verifyGoogleToken } from '~~/server/utils/google-oauth'
import { findUserByGoogleId, createGoogleUser, createSession, setAuthCookie, findUser } from '~~/server/utils/auth'
import { useDatabase } from '~~/server/db'
import { user } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

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
      message: ERROR_KEYS.MISSING_AUTHORIZATION_CODE,
    })
  }
  const { code, state } = parsed.data

  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw createError({
        statusCode: 500,
        message: ERROR_KEYS.GOOGLE_OAUTH_NOT_CONFIGURED,
      })
    }

    const originHeader = getHeader(event, 'origin')
    const refererHeader = getHeader(event, 'referer')

    let origin: string | undefined
    if (originHeader) {
      origin = originHeader
    }
    else if (refererHeader) {
      try {
        const refererUrl = new URL(refererHeader)
        origin = refererUrl.origin
      }
      catch {
        origin = undefined
      }
    }

    if (!origin) {
      throw createError({
        statusCode: 400,
        message: ERROR_KEYS.UNABLE_TO_DETERMINE_ORIGIN,
      })
    }

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
      secureLog.error('Token exchange failed:', errorText)
      throw createError({
        statusCode: 400,
        message: ERROR_KEYS.FAILED_TO_EXCHANGE_CODE,
      })
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json()
    const { id_token } = tokens

    if (!id_token) {
      throw createError({
        statusCode: 400,
        message: ERROR_KEYS.NO_ID_TOKEN_RECEIVED,
      })
    }

    const googleUserInfo = await verifyGoogleToken(id_token)

    const now = new Date()

    let authenticatedUser = await findUserByGoogleId(googleUserInfo.id, event)

    if (!authenticatedUser) {
      const existingUserByEmail = await findUser(googleUserInfo.email, event)

      if (existingUserByEmail) {
        if (existingUserByEmail.passwordHash) {
          throw createError({
            statusCode: 409,
            message: ERROR_KEYS.ACCOUNT_EXISTS_PASSWORD,
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
        message: ERROR_KEYS.FAILED_TO_AUTHENTICATE,
      })
    }

    const sessionToken = await createSession(authenticatedUser.id, now, event)
    setAuthCookie(event, sessionToken)

    return {
      user: {
        id: authenticatedUser.id,
        username: authenticatedUser.username,
        mainCurrency: authenticatedUser.mainCurrency,
        isAdmin: authenticatedUser.isAdmin,
      },
      redirectTo: state || '/',
    }
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    secureLog.error('Google authentication error:', error instanceof Error ? error.message : error)

    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.GOOGLE_AUTH_FAILED,
    })
  }
})
