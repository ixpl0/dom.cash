import { getSessionUser } from '~~/server/utils/session'

export default defineNuxtPlugin(async () => {
  const event = useRequestEvent()
  if (!event) {
    return
  }

  const { setUser } = useAuthState()
  setUser(await getSessionUser(event))
})
