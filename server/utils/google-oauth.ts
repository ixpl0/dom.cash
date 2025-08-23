interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture?: string
}

export const verifyGoogleToken = async (token: string): Promise<GoogleUserInfo> => {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`)

    if (!response.ok) {
      throw new Error(`Google API responded with ${response.status}`)
    }

    const payload = await response.json() as {
      sub?: string
      email?: string
      name?: string
      picture?: string
      aud?: string
      exp?: number
      iat?: number
    }

    if (!payload.sub || !payload.email) {
      throw new Error('Missing required user information')
    }

    if (payload.aud !== process.env.GOOGLE_OAUTH_CLIENT_ID) {
      throw new Error('Token audience mismatch')
    }

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token has expired')
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
