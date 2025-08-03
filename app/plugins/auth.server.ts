export default defineNuxtPlugin(async () => {
  const { token, fetchUser } = useAuth()

  console.log('[auth.server.ts] SSR cookies header:', useRequestHeaders(['cookie']))
  if (token.value) {
    await fetchUser()
  }
})
