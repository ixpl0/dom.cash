import { defineEventHandler, createError } from 'h3'
import { getGoogleClientId } from '~~/server/utils/google-oauth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async () => {
  try {
    const clientId = getGoogleClientId()

    return {
      clientId,
    }
  }
  catch {
    throw createError({
      statusCode: 503,
      message: ERROR_KEYS.GOOGLE_OAUTH_NOT_CONFIGURED,
    })
  }
})
