export interface User {
  id: string
  username: string
  mainCurrency: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export const useAuth = () => {
  const user = useState<User | null>('auth.user', () => null)

  const login = async (credentials: LoginCredentials): Promise<void> => {
    const response = await $fetch<{
      user: User
      token: string
      expiresAt: string
    }>('/api/auth', {
      method: 'POST',
      body: credentials,
    })

    user.value = response.user

    await navigateTo('/')
  }

  const logout = async (): Promise<void> => {
    await $fetch('/api/auth/logout', {
      method: 'POST',
    }).catch(() => {})

    user.value = null

    await navigateTo('/', { replace: true })
  }

  const restoreSession = async (): Promise<void> => {
    if (user.value || import.meta.server) return

    try {
      const response = await $fetch<{ user: User }>('/api/auth/me')
      user.value = response.user
    }
    catch {
      user.value = null
    }
  }

  const isAuthenticated = computed(() => Boolean(user.value))

  return {
    user: readonly(user),
    isAuthenticated,
    login,
    logout,
    restoreSession,
  }
}
