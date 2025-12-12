import type { User } from '~~/shared/types'

export const useUser = () => {
  const userData = useState<User | null>('user.data', () => null)

  const loadUserData = async (): Promise<void> => {
    userData.value = await $fetch<User>('/api/auth/me')
  }

  const mainCurrency = computed(() => userData.value?.mainCurrency || 'USD')

  return {
    userData: readonly(userData),
    user: readonly(userData),
    mainCurrency,
    loadUserData,
  }
}
