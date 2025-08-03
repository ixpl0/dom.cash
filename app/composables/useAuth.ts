import { setCookie } from 'h3'

export interface User {
  id: string
  username: string
  mainCurrency: string
}

export interface AuthResponse {
  success: boolean
  token: string
  isNewUser: boolean
  user: User
}

export interface LoginCredentials {
  username: string
  password: string
}

export const useAuth = () => {
  const user = useState<User | null>('auth.user', () => null)
  const token = useCookie<string | null>('auth-token', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const data = await $fetch<AuthResponse>('/api/auth', {
      method: 'POST',
      body: credentials,
    })

    if (data.success) {
      if (import.meta.server) {
        const event = useRequestEvent()
        if (event) {
          setCookie(event, 'auth-token', data.token, {
            httpOnly: false,
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          })
        }
      } else {
        token.value = data.token
      }

      user.value = data.user
    }

    return data
  }

  const logout = async (): Promise<void> => {
    token.value = null
    user.value = null
    await navigateTo('/auth')
  }

  const fetchUser = async (): Promise<void> => {
    if (!token.value) return

    try {
      const response = await $fetch<{ user: User }>('/api/user')
      user.value = response.user
    }
    catch {
      token.value = null
      user.value = null
    }
  }

  const initializeAuth = async (): Promise<void> => {
    if (token.value && !user.value) {
      await fetchUser()
    }
  }

  const isAuthenticated = computed(() => {
    return Boolean(user.value && token.value)
  })

  return {
    user: readonly(user),
    token: readonly(token),
    isAuthenticated,
    login,
    logout,
    fetchUser,
    initializeAuth,
  }
}
