import { validateAuthToken } from '~~/shared/utils/auth'

export default defineNuxtPlugin(async () => {
  const event = useRequestEvent()
  if (!event) return

  const { user } = await validateAuthToken(event)

  if (user) {
    const { setUser } = useAuthState()
    setUser(user)
  }
})
