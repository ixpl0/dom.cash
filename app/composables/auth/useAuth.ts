import type { CodeRequestResult, LoginCredentials, User } from '~~/shared/types'

interface GoogleLoginResult {
  user: User
  redirectTo: string
}

export const useAuth = () => {
  const { user, setUser, clearUser, isAuthenticated } = useAuthState()
  const { $backHandlers, $sessionSync } = useNuxtApp()
  const lastSharedBudgetCookie = useCookie<string | null>(COOKIE_NAMES.lastSharedBudget)

  const acceptUser = (newUser: User): void => {
    setUser(newUser)
    if (import.meta.client) {
      $sessionSync.announceSignIn(newUser.id)
    }
  }

  const signIn = async (request: Promise<User>): Promise<void> => {
    acceptUser(await request)
  }

  const login = (credentials: LoginCredentials): Promise<void> =>
    signIn($fetch<User>('/api/auth', {
      method: 'POST',
      body: credentials,
    }))

  const registerWithoutCode = ({ username, password }: LoginCredentials): Promise<void> =>
    signIn($fetch<User>('/api/auth/register-direct', {
      method: 'POST',
      body: { email: username, password },
    }))

  const sendRegistrationCode = (email: string): Promise<CodeRequestResult> =>
    $fetch<CodeRequestResult>('/api/auth/send-code', {
      method: 'POST',
      body: { email },
    })

  const register = ({ username, password }: LoginCredentials, code: string): Promise<void> =>
    signIn($fetch<User>('/api/auth/verify-code', {
      method: 'POST',
      body: { email: username, code, password },
    }))

  const sendPasswordResetCode = (email: string): Promise<CodeRequestResult> =>
    $fetch<CodeRequestResult>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    })

  const resetPassword = async (email: string, code: string, newPassword: string): Promise<void> => {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { email, code, newPassword },
    })
  }

  const logout = async (): Promise<void> => {
    await $fetch('/api/auth/logout', {
      method: 'POST',
    }).catch(() => {})

    lastSharedBudgetCookie.value = null

    if (import.meta.client) {
      $sessionSync.announceSignOut()
      await nextTick()
      $backHandlers.forgetGuardEntry()
      window.location.replace('/')
      return
    }

    clearUser()
    await navigateTo('/', { replace: true })
  }

  const loginWithGoogle = async (): Promise<void> => {
    if (import.meta.server) {
      throw new Error('Google OAuth is only available in browser')
    }

    const currentUrl = new URL(window.location.href)
    const redirect = currentUrl.searchParams.get('redirect')
    const response = await $fetch<{ authUrl: string }>('/api/auth/google-url', {
      query: redirect ? { redirect } : undefined,
    })

    window.location.href = response.authUrl
  }

  const finishGoogleLogin = async (code: string, state: string): Promise<string> => {
    const response = await $fetch<GoogleLoginResult>('/api/auth/google-redirect', {
      method: 'POST',
      query: { code, state },
    })

    acceptUser(response.user)
    return response.redirectTo
  }

  return {
    user,
    isAuthenticated,
    login,
    registerWithoutCode,
    sendRegistrationCode,
    register,
    sendPasswordResetCode,
    resetPassword,
    logout,
    loginWithGoogle,
    finishGoogleLogin,
  }
}
