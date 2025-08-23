import { OAuth2Client } from 'google-auth-library'
import type { TokenPayload } from 'google-auth-library'

interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture?: string
}

const getGoogleClient = (): OAuth2Client => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  return new OAuth2Client(clientId, clientSecret)
}

export const verifyGoogleToken = async (token: string): Promise<GoogleUserInfo> => {
  const client = getGoogleClient()

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    })

    const payload: TokenPayload | undefined = ticket.getPayload()

    if (!payload) {
      throw new Error('Invalid token payload')
    }

    if (!payload.sub || !payload.email) {
      throw new Error('Missing required user information')
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture,
    }
  }
  catch (error) {
    throw new Error(`Google token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const getGoogleClientId = (): string => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!clientId) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID not configured')
  }
  return clientId
}
