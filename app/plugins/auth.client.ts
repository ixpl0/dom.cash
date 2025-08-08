export default defineNuxtPlugin(async () => {
  const { restoreSession } = useAuth()
  const { user } = useAuthState()

  if (!user.value) {
    await restoreSession()
  }
})
