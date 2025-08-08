export default defineNuxtPlugin(async () => {
  const { restoreSession } = useAuth()
  const userState = useState('auth.user')

  if (!userState.value) {
    await restoreSession()
  }
})
