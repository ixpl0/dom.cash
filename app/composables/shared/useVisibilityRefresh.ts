const DEFAULT_STALE_THRESHOLD_MS = 5 * 60 * 1000

export const useVisibilityRefresh = (
  refreshFn: () => Promise<void>,
  staleThresholdMs: number = DEFAULT_STALE_THRESHOLD_MS,
) => {
  const lastFetchTime = ref(Date.now())

  const handleVisibilityChange = async () => {
    if (document.visibilityState !== 'visible') {
      return
    }

    const elapsed = Date.now() - lastFetchTime.value
    if (elapsed > staleThresholdMs) {
      await refreshFn()
      lastFetchTime.value = Date.now()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  const markFetched = () => {
    lastFetchTime.value = Date.now()
  }

  return { markFetched }
}
