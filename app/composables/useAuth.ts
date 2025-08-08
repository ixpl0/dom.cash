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
    user.value = null

    await $fetch('/api/auth/logout', {
      method: 'POST',
    }).catch(() => {
      // Ignore logout errors
    })

    await navigateTo('/auth')
  }

  const isAuthenticated = computed(() => Boolean(user.value))

  return {
    user: readonly(user),
    isAuthenticated,
    login,
    logout,
  }
}
