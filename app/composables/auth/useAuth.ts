import type { User, LoginCredentials } from '~~/shared/types'

export const useAuth = () => {
  const { user, setUser, clearUser, isAuthenticated } = useAuthState()

  const login = async (credentials: LoginCredentials): Promise<void> => {
    const authenticatedUser = await $fetch<User>('/api/auth', {
      method: 'POST',
      body: credentials,
    })

    setUser(authenticatedUser)

    if (import.meta.client) {
      localStorage.setItem('hasSession', 'true')
    }
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
    if (user.value) {
      return
    }

    if (import.meta.client && !localStorage.getItem('hasSession')) {
      return
    }

    try {
      const requestFetch = useRequestFetch()
      const authenticatedUser = await requestFetch<User>('/api/auth/me')
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
      const currentUrl = new URL(window.location.href)
      const redirect = currentUrl.searchParams.get('redirect')
      const response = await $fetch<{ authUrl: string }>('/api/auth/google-url', {
        query: redirect ? { redirect } : undefined,
      })

      window.location.href = response.authUrl
    }
    catch (error) {
      console.error('Failed to redirect to Google OAuth:', error)
      const t = useT()
      throw new Error(t('auth.googleRedirectError'))
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
