const DEFAULT_STALE_THRESHOLD_MS = 15 * 60 * 1000

const formatElapsed = (ms: number): string => {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainderSeconds = seconds % 60
  return `${minutes}m${remainderSeconds}s`
}

export const useVisibilityRefresh = (
  refreshFn: () => Promise<void>,
  staleThresholdMs: number = DEFAULT_STALE_THRESHOLD_MS,
) => {
  const instanceId = Math.random().toString(36).slice(2, 8)
  const lastFetchTime = ref(Date.now())

  console.log(`[visibility:${instanceId}] composable called, lastFetchTime set to now`)

  const runRefreshIfStale = async (trigger: string) => {
    const elapsed = Date.now() - lastFetchTime.value
    const isStale = elapsed > staleThresholdMs

    console.log(`[visibility:${instanceId}] ${trigger} fired, elapsed=${formatElapsed(elapsed)}, stale=${isStale}, visibilityState=${document.visibilityState}`)

    if (!isStale) {
      return
    }

    try {
      await refreshFn()
      lastFetchTime.value = Date.now()

      console.log(`[visibility:${instanceId}] refresh completed via ${trigger}`)
    }
    catch (err) {
      console.error(`[visibility:${instanceId}] refresh failed via ${trigger}`, err)
    }
  }

  const handleVisibilityChange = async () => {
    console.log(`[visibility:${instanceId}] visibilitychange raw event, state=${document.visibilityState}`)
    if (document.visibilityState !== 'visible') {
      return
    }
    await runRefreshIfStale('visibilitychange')
  }

  const handleFocus = async () => {
    await runRefreshIfStale('focus')
  }

  const handlePageShow = async (event: PageTransitionEvent) => {
    console.log(`[visibility:${instanceId}] pageshow event, persisted=${event.persisted}`)
    if (!event.persisted) {
      return
    }
    await runRefreshIfStale('pageshow')
  }

  onMounted(() => {
    console.log(`[visibility:${instanceId}] onMounted, registering listeners`)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handlePageShow)
  })

  onUnmounted(() => {
    console.log(`[visibility:${instanceId}] onUnmounted, removing listeners`)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handleFocus)
    window.removeEventListener('pageshow', handlePageShow)
  })

  const markFetched = () => {
    lastFetchTime.value = Date.now()
  }

  return { markFetched }
}
