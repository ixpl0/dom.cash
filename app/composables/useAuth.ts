import type { User, LoginCredentials } from '~~/shared/types'

export const useAuth = () => {
  const { user, setUser, clearUser, isAuthenticated } = useAuthState()

  const login = async (credentials: LoginCredentials): Promise<void> => {
    const user = await $fetch<User>('/api/auth', {
      method: 'POST',
      body: credentials,
    })

    setUser(user)

    if (import.meta.client) {
      localStorage.setItem('hasSession', 'true')
    }

    await navigateTo('/')
  }

  const logout = async (): Promise<void> => {
    await $fetch('/api/auth/logout', {
      method: 'POST',
    }).catch(() => {})

    clearUser()

    if (import.meta.client) {
      localStorage.removeItem('hasSession')
    }

    await navigateTo('/', { replace: true })
  }

  const restoreSession = async (): Promise<void> => {
    if (user.value) return

    if (import.meta.client && !localStorage.getItem('hasSession')) {
      return
    }

    try {
      const { data: userData, error } = await useFetch<User>('/api/auth/me', {
        key: 'restore-session',
        server: true,
      })

      if (error.value) {
        throw new Error(error.value.message || 'Authentication failed')
      }

      const authenticatedUser = userData.value
      if (!authenticatedUser) {
        throw new Error('Authentication failed')
      }
      setUser(authenticatedUser)

      if (import.meta.client) {
        localStorage.setItem('hasSession', 'true')
      }
    }
    catch {
      clearUser()

      if (import.meta.client) {
        localStorage.removeItem('hasSession')
      }
    }
  }

  const loginWithGoogle = async (): Promise<void> => {
    if (import.meta.server) {
      throw new Error('Google OAuth is only available in browser')
    }

    try {
      const config = await $fetch<{ clientId: string }>('/api/auth/google-config')

      const currentUrl = new URL(window.location.href)
      const redirectUri = `${currentUrl.origin}/auth`

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', config.clientId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', 'openid profile email')
      authUrl.searchParams.set('access_type', 'online')
      authUrl.searchParams.set('prompt', 'select_account')

      const redirect = currentUrl.searchParams.get('redirect')
      if (redirect) {
        authUrl.searchParams.set('state', redirect)
      }

      window.location.href = authUrl.toString()
    }
    catch (error) {
      console.error('Failed to redirect to Google OAuth:', error)
      throw new Error('Не удалось перенаправить на Google OAuth')
    }
  }

  return {
    user,
    isAuthenticated,
    setUser,
    login,
    logout,
    restoreSession,
    loginWithGoogle,
  }
}
