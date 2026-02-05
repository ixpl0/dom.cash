import { deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import { timingSafeCompareStrings } from '~~/server/utils/crypto'
import { generateSessionToken } from '~~/server/utils/auth'

const GOOGLE_OAUTH_STATE_COOKIE = 'google-oauth-state'
const GOOGLE_OAUTH_REDIRECT_COOKIE = 'google-oauth-redirect'
const GOOGLE_OAUTH_COOKIE_MAX_AGE = 60 * 10

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    path: '/',
    maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE,
  }
}

export const sanitizeOAuthRedirect = (redirect: string | undefined): string => {
  if (!redirect) {
    return '/'
  }

  if (!redirect.startsWith('/')) {
    return '/'
  }

  if (redirect.startsWith('//')) {
    return '/'
  }

  return redirect
}

export const createGoogleOAuthState = (): string => {
  return generateSessionToken()
}

export const setGoogleOAuthState = (
  event: H3Event,
  state: string,
  redirect: string,
): void => {
  const options = getCookieOptions()

  setCookie(event, GOOGLE_OAUTH_STATE_COOKIE, state, options)
  setCookie(event, GOOGLE_OAUTH_REDIRECT_COOKIE, redirect, options)
}

export const validateGoogleOAuthState = (
  event: H3Event,
  stateFromQuery: string,
): boolean => {
  const stateFromCookie = getCookie(event, GOOGLE_OAUTH_STATE_COOKIE)

  if (!stateFromCookie) {
    return false
  }

  return timingSafeCompareStrings(stateFromCookie, stateFromQuery)
}

export const getGoogleOAuthRedirect = (event: H3Event): string => {
  const redirect = getCookie(event, GOOGLE_OAUTH_REDIRECT_COOKIE)
  return sanitizeOAuthRedirect(redirect)
}

export const clearGoogleOAuthState = (event: H3Event): void => {
  deleteCookie(event, GOOGLE_OAUTH_STATE_COOKIE, { path: '/' })
  deleteCookie(event, GOOGLE_OAUTH_REDIRECT_COOKIE, { path: '/' })
}
