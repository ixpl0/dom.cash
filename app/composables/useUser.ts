interface UserData {
  id: string
  username: string
  mainCurrency: string
}

export const useUser = () => {
  const userData = useState<UserData | null>('user.data', () => null)

  const loadUserData = async (): Promise<void> => {
    userData.value = await $fetch<UserData>('/api/auth/me')
  }

  const mainCurrency = computed(() => userData.value?.mainCurrency || 'USD')

  return {
    userData: readonly(userData),
    user: readonly(userData),
    mainCurrency,
    loadUserData,
  }
}
