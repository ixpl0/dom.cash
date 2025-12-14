import { getOptionalAuth } from '~~/server/utils/session'

export default defineNuxtPlugin(async () => {
  const event = useRequestEvent()
  if (!event) {
    return
  }

  const user = await getOptionalAuth(event)

  if (user) {
    const { setUser } = useAuthState()
    setUser(user)

    const todoStore = useTodoStore()
    await todoStore.refresh()
  }
})
