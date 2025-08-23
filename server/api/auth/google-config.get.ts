import { defineEventHandler, createError } from 'h3'
import { getGoogleClientId } from '~~/server/utils/google-oauth'

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
      message: 'Google OAuth not configured',
    })
  }
})
