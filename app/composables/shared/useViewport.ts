const MOBILE_VIEWPORT_QUERY = '(max-width: 767px)'

export const useIsMobileViewport = () => {
  const isMobileViewport = ref(false)
  let mediaQuery: MediaQueryList | null = null

  const updateViewport = (): void => {
    isMobileViewport.value = mediaQuery?.matches ?? false
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY)
    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
  })

  onUnmounted(() => {
    mediaQuery?.removeEventListener('change', updateViewport)
    mediaQuery = null
  })

  return { isMobileViewport }
}
