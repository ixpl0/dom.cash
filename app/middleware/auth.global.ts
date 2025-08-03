export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, initializeAuth } = useAuth()

  const isPublicRoute = constants.publicRoutes.includes(to.path)

  if (!isPublicRoute) {
    await initializeAuth()

    if (!isAuthenticated.value) {
      return navigateTo({
        path: '/auth',
        query: { redirect: to.fullPath },
      })
    }
  }
})
