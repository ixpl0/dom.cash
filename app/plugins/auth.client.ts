export default defineNuxtPlugin(async () => {
  const { initializeAuth } = useAuth()
  await initializeAuth()
})
