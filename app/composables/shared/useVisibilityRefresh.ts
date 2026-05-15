const DEFAULT_STALE_THRESHOLD_MS = 15 * 60 * 1000
const PERIODIC_CHECK_MS = 60 * 1000

export const useVisibilityRefresh = (
  refreshFn: () => Promise<void>,
  staleThresholdMs: number = DEFAULT_STALE_THRESHOLD_MS,
) => {
  const lastFetchTime = ref(Date.now())
  const isRefreshing = ref(false)
  let intervalId: ReturnType<typeof setInterval> | null = null

  const runRefreshIfStale = async () => {
    if (isRefreshing.value) {
      return
    }
    if (document.visibilityState !== 'visible') {
      return
    }
    const elapsed = Date.now() - lastFetchTime.value
    if (elapsed <= staleThresholdMs) {
      return
    }

    isRefreshing.value = true
    try {
      await refreshFn()
      lastFetchTime.value = Date.now()
    }
    catch (err) {
      console.error('Visibility refresh failed', err)
    }
    finally {
      isRefreshing.value = false
    }
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible') {
      return
    }
    runRefreshIfStale()
  }

  const handleFocus = () => {
    runRefreshIfStale()
  }

  const handlePageShow = (event: PageTransitionEvent) => {
    if (!event.persisted) {
      return
    }
    runRefreshIfStale()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handlePageShow)
    intervalId = setInterval(runRefreshIfStale, PERIODIC_CHECK_MS)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handleFocus)
    window.removeEventListener('pageshow', handlePageShow)
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  })

  const markFetched = () => {
    lastFetchTime.value = Date.now()
  }

  return { markFetched }
}
