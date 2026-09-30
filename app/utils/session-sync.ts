export const AUTH_CHANNEL_NAME = 'auth'

export const SESSION_CHECK_AFTER_FAILURES = 2

export type AuthMessage = { type: 'signed-out' } | { type: 'signed-in', userId: string }

interface SessionLostCheck {
  requestUrl: string
  status: number | undefined
  isSignedIn: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const parseAuthMessage = (data: unknown): AuthMessage | null => {
  if (!isRecord(data)) {
    return null
  }
  if (data.type === 'signed-out') {
    return { type: 'signed-out' }
  }
  if (data.type === 'signed-in' && typeof data.userId === 'string') {
    return { type: 'signed-in', userId: data.userId }
  }
  return null
}

export const shouldReloadForAuthMessage = (message: AuthMessage, currentUserId: string | null): boolean =>
  message.type === 'signed-out'
    ? currentUserId !== null
    : message.userId !== currentUserId

export const getRequestPath = (requestUrl: string, origin: string): string | null => {
  try {
    const url = new URL(requestUrl, origin)
    return url.origin === origin ? url.pathname : null
  }
  catch {
    return null
  }
}

export const isSessionLost = ({ requestUrl, status, isSignedIn }: SessionLostCheck, origin: string): boolean => {
  if (status !== 401 || !isSignedIn) {
    return false
  }
  const path = getRequestPath(requestUrl, origin)
  return path !== null && path.startsWith('/api/') && path !== '/api/auth' && !path.startsWith('/api/auth/')
}

export const shouldCheckSession = (failedAttempts: number): boolean =>
  failedAttempts >= SESSION_CHECK_AFTER_FAILURES
