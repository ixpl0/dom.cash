import type { User, LoginCredentials } from '~~/shared/types'

export const useAuth = () => {
  const { user, setUser, clearUser, isAuthenticated } = useAuthState()

  const login = async (credentials: LoginCredentials): Promise<void> => {
    const user = await $fetch<User>('/api/auth', {
      method: 'POST',
      body: credentials,
    })

    setUser(user)

    await navigateTo('/')
  }

  const logout = async (): Promise<void> => {
    await $fetch('/api/auth/logout', {
      method: 'POST',
    }).catch(() => {})

    clearUser()

    await navigateTo('/', { replace: true })
  }

  const restoreSession = async (): Promise<void> => {
    if (user.value || import.meta.server) return

    try {
      const user = await $fetch<User>('/api/auth/me')
      setUser(user)
    }
    catch {
      clearUser()
    }
  }

  return {
    user,
    isAuthenticated,
    login,
    logout,
    restoreSession,
  }
}
