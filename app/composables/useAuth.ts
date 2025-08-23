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
    if (user.value || import.meta.server) return

    if (import.meta.client && !localStorage.getItem('hasSession')) {
      return
    }

    try {
      const user = await $fetch<User>('/api/auth/me')
      setUser(user)

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

    return new Promise<void>((resolve, reject) => {
      const loadGoogleScript = () => {
        return new Promise<void>((scriptResolve, scriptReject) => {
          if (typeof (window as unknown as Record<string, unknown>).google !== 'undefined') {
            scriptResolve()
            return
          }

          const script = document.createElement('script')
          script.src = 'https://accounts.google.com/gsi/client'
          script.onload = () => scriptResolve()
          script.onerror = () => scriptReject(new Error('Failed to load Google SDK'))
          document.head.appendChild(script)
        })
      }

      const initializeGoogle = async () => {
        try {
          await loadGoogleScript()

          const config = await $fetch<{ clientId: string }>('/api/auth/google-config')
          const google = (window as unknown as Record<string, unknown>).google as {
            accounts: {
              id: {
                initialize: (config: {
                  client_id: string
                  callback: (response: { credential: string }) => void
                  use_fedcm_for_prompt?: boolean
                }) => void
                prompt: (callback?: (notification: { isNotDisplayed(): boolean, isSkippedMoment(): boolean }) => void) => void
                renderButton: (element: HTMLElement, options: { theme?: 'outline' | 'filled_blue' | 'filled_black', size?: 'large' | 'medium' | 'small' }) => void
              }
            }
          }

          console.log('Initializing Google OAuth with origin:', window.location.origin)

          google.accounts.id.initialize({
            client_id: config.clientId,
            callback: async (response: { credential: string }) => {
              try {
                console.log('Google OAuth callback received')
                const user = await $fetch<User>('/api/auth/google', {
                  method: 'POST',
                  body: { token: response.credential },
                })

                setUser(user)

                if (import.meta.client) {
                  localStorage.setItem('hasSession', 'true')
                }

                await navigateTo('/')
                resolve()
              }
              catch (error) {
                console.error('Google login error:', error)
                reject(error instanceof Error ? error : new Error('Google login failed'))
              }
            },
            use_fedcm_for_prompt: false,
          })

          console.log('Calling Google prompt...')
          google.accounts.id.prompt((notification) => {
            console.log('Google prompt notification:', notification)
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              console.log('Google prompt not displayed or skipped')
              resolve()
            }
          })
        }
        catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to initialize Google OAuth'))
        }
      }

      initializeGoogle()
    })
  }

  return {
    user,
    isAuthenticated,
    login,
    logout,
    restoreSession,
    loginWithGoogle,
  }
}
