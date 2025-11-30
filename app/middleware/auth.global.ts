import constants from '~/utils/constants'

export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, restoreSession } = useAuth()

  await restoreSession()

  const isPublicRoute = constants.publicRoutes.some((route) => {
    if (route.endsWith('*')) {
      return to.path.startsWith(route.slice(0, -1))
    }
    return to.path === route
  })

  if (!isPublicRoute && !isAuthenticated.value) {
    return navigateTo({
      path: '/auth',
      query: { redirect: to.fullPath },
    })
  }
})
