export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, restoreSession } = useAuth()

  const isPublicRoute = constants.publicRoutes.includes(to.path)

  if (!isPublicRoute) {
    await restoreSession()

    if (!isAuthenticated.value) {
      return navigateTo({
        path: '/auth',
        query: { redirect: to.fullPath },
      })
    }
  }
})
