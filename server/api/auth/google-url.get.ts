import { createError, defineEventHandler, getQuery, getRequestURL } from 'h3'
import { z } from 'zod'
import { getGoogleClientId } from '~~/server/utils/google-oauth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import {
  createGoogleOAuthState,
  sanitizeOAuthRedirect,
  setGoogleOAuthState,
} from '~~/server/utils/google-auth-state'

const querySchema = z.object({
  redirect: z.string().optional(),
})

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const parsedQuery = querySchema.safeParse(query)

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.INVALID_QUERY_PARAMETERS,
    })
  }

  let clientId: string

  try {
    clientId = getGoogleClientId()
  }
  catch {
    throw createError({
      statusCode: 503,
      message: ERROR_KEYS.GOOGLE_OAUTH_NOT_CONFIGURED,
    })
  }

  const redirect = sanitizeOAuthRedirect(parsedQuery.data.redirect)
  const state = createGoogleOAuthState()
  setGoogleOAuthState(event, state, redirect)

  const requestUrl = getRequestURL(event)
  const redirectUri = `${requestUrl.origin}/auth`

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid profile email')
  authUrl.searchParams.set('access_type', 'online')
  authUrl.searchParams.set('prompt', 'select_account')
  authUrl.searchParams.set('state', state)

  return {
    authUrl: authUrl.toString(),
  }
})
