import type { User } from '~~/shared/types'

export const useAuthState = () => {
  const user = useState<User | null>('auth.user', () => null)

  return {
    user: readonly(user),
    setUser: (newUser: User | null): void => {
      user.value = newUser
    },
    clearUser: (): void => {
      user.value = null
    },
    isAuthenticated: computed(() => Boolean(user.value)),
  }
}
