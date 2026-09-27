import type { NotificationEvent } from '~~/shared/types/i18n'
import { formatNotificationMessage, getReconnectDelay, getStaleStores, parseServerMessage } from '~/utils/notifications'

const STALE_AFTER_MS = 15 * 60 * 1000
const REFRESH_CHECK_MS = 3000

export default defineNuxtPlugin({
  name: 'live-data',
  dependsOn: ['back-handlers'],
  setup: (nuxtApp) => {
    const { $i18n, $backHandlers } = useNuxtApp()
    const { user } = useAuthState()
    const { toast } = useToast()
    const budgetStore = useBudgetStore()
    const todoStore = useTodoStore()

    let eventSource: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let failedAttempts = 0
    let hasConnected = false
    let watchedBudget: string | null = null
    let isRefreshing = false

    const postSubscription = async (action: 'subscribe' | 'unsubscribe', username: string): Promise<void> => {
      try {
        await $fetch(`/api/notifications/${action}/${username}`, { method: 'POST' })
      }
      catch (error) {
        console.error(`Failed to ${action} budget notifications`, error)
      }
    }

    const isConnected = (): boolean => eventSource?.readyState === EventSource.OPEN

    const markLiveStoresStale = (): void => {
      if (watchedBudget) {
        budgetStore.markStale()
      }
      todoStore.markStale()
    }

    const handleConnected = (): void => {
      failedAttempts = 0
      if (hasConnected) {
        markLiveStoresStale()
      }
      hasConnected = true
      if (watchedBudget) {
        postSubscription('subscribe', watchedBudget)
      }
    }

    const handleNotification = (notification: NotificationEvent): void => {
      toast({ message: formatNotificationMessage(notification, $i18n.t) })

      const shownBudgetOwnerId = watchedBudget ? budgetStore.data?.user.id ?? null : null
      const staleStores = getStaleStores(notification, shownBudgetOwnerId)
      if (staleStores.budget) {
        budgetStore.markStale()
      }
      if (staleStores.todo) {
        todoStore.markStale()
      }
    }

    const handleMessage = (event: MessageEvent<string>): void => {
      try {
        const message = parseServerMessage(event.data)
        if (message?.type === 'connected') {
          handleConnected()
        }
        else if (message && message.type !== 'ping') {
          handleNotification(message)
        }
      }
      catch (error) {
        console.error('Failed to read a notification', error)
      }
    }

    const disconnect = (): void => {
      clearTimeout(reconnectTimer)
      eventSource?.close()
      eventSource = null
    }

    const connect = (): void => {
      disconnect()
      const source = new EventSource('/api/notifications/events')

      source.onmessage = handleMessage
      source.onerror = () => {
        source.close()
        if (eventSource !== source) {
          return
        }
        eventSource = null
        reconnectTimer = setTimeout(connect, getReconnectDelay(failedAttempts))
        failedAttempts += 1
      }

      eventSource = source
    }

    const markOldDataStale = (): void => {
      const staleBefore = Date.now() - STALE_AFTER_MS
      if (watchedBudget && budgetStore.lastLoadAt !== null && budgetStore.lastLoadAt < staleBefore) {
        budgetStore.markStale()
      }
      if (todoStore.lastLoadAt !== null && todoStore.lastLoadAt < staleBefore) {
        todoStore.markStale()
      }
    }

    const refreshStaleData = async (): Promise<void> => {
      if (isRefreshing || document.visibilityState !== 'visible' || $backHandlers.hasHandlers()) {
        return
      }

      markOldDataStale()
      isRefreshing = true
      try {
        if (watchedBudget) {
          await budgetStore.refreshIfStale()
        }
        await todoStore.refreshIfStale()
      }
      finally {
        isRefreshing = false
      }
    }

    const watchBudget = (username: string): void => {
      if (watchedBudget && watchedBudget !== username && isConnected()) {
        postSubscription('unsubscribe', watchedBudget)
      }
      watchedBudget = username
      if (isConnected()) {
        postSubscription('subscribe', username)
      }
    }

    const unwatchBudget = (username: string): void => {
      if (watchedBudget !== username) {
        return
      }
      watchedBudget = null
      if (isConnected()) {
        postSubscription('unsubscribe', username)
      }
    }

    nuxtApp.hook('app:mounted', () => {
      watch(() => user.value?.id, (userId) => {
        hasConnected = false
        if (userId) {
          connect()
        }
        else {
          disconnect()
        }
      }, { immediate: true })

      document.addEventListener('visibilitychange', refreshStaleData)
      window.addEventListener('focus', refreshStaleData)
      window.addEventListener('pageshow', refreshStaleData)
      setInterval(refreshStaleData, REFRESH_CHECK_MS)
    })

    return {
      provide: {
        liveData: { watchBudget, unwatchBudget },
      },
    }
  },
})
