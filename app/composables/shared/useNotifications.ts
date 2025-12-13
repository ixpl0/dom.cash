import type { NotificationType, NotificationParams } from '~~/shared/types/i18n'

export interface NotificationEvent {
  id: string
  type: NotificationType
  params: NotificationParams
  createdAt: string
}

const formatNotificationMessage = (
  event: NotificationEvent,
  t: ReturnType<typeof useI18n>['t'],
): string => {
  const { type, params } = event

  const translatedParams: Record<string, string | number> = {}

  if (params.username) {
    translatedParams.username = params.username
  }
  if (params.currency) {
    translatedParams.currency = params.currency
  }
  if (params.year !== undefined) {
    translatedParams.year = params.year
  }
  if (params.description) {
    translatedParams.description = params.description
  }
  if (params.amount !== undefined) {
    translatedParams.amount = params.amount
  }
  if (params.entryCurrency) {
    translatedParams.entryCurrency = params.entryCurrency
  }
  if (params.monthsCount !== undefined) {
    translatedParams.monthsCount = params.monthsCount
  }
  if (params.entriesCount !== undefined) {
    translatedParams.entriesCount = params.entriesCount
  }
  if (params.month) {
    translatedParams.month = t(`month.${params.month}`)
  }
  if (params.kind) {
    translatedParams.kind = t(`entryKind.${params.kind}`)
  }
  if (params.access) {
    translatedParams.access = t(`accessLevel.${params.access}`)
  }
  if (params.memoContent) {
    translatedParams.memoContent = params.memoContent
  }
  if (params.isCompleted !== undefined) {
    translatedParams.isCompleted = t(`memoStatus.${params.isCompleted ? 'completed' : 'incomplete'}`)
  }

  return t(`notifications.${type}`, translatedParams)
}

export const useNotifications = () => {
  let eventSource: EventSource | null = null
  let currentBudgetOwner: string | null = null
  const isConnected = ref(false)

  const { toast } = useToast()
  const { showWarningBanner } = useOutdatedBanner()
  const { t } = useI18n()

  const connect = () => {
    if (eventSource) {
      disconnect()
    }

    eventSource = new EventSource('/api/notifications/events')

    eventSource.onopen = () => {
      isConnected.value = true
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as NotificationEvent | { type: 'connected' | 'ping' }

        if (data.type === 'connected') {
          isConnected.value = true
          return
        }

        if (data.type === 'ping') {
          return
        }

        const notificationEvent = data as NotificationEvent
        const message = formatNotificationMessage(notificationEvent, t)
        toast({ message })
        showWarningBanner()
      }
      catch (error) {
        console.error('Error parsing event data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Error connecting to event source:', error)
      isConnected.value = false
      eventSource?.close()

      setTimeout(() => {
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          connect()
        }
      }, 5000)
    }
  }

  const disconnect = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
      isConnected.value = false
    }
  }

  const subscribeToBudgetByUsername = async (username: string) => {
    if (currentBudgetOwner === username) {
      return
    }

    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      await $fetch(`/api/notifications/subscribe/${username}`, {
        method: 'POST',
        headers,
      })
      currentBudgetOwner = username
    }
    catch (error) {
      console.error('Error subscribing to budget:', error)
    }
  }

  const unsubscribeFromBudgetByUsername = async (username: string) => {
    if (currentBudgetOwner !== username) {
      return
    }

    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      await $fetch(`/api/notifications/unsubscribe/${username}`, {
        method: 'POST',
        headers,
      })
      currentBudgetOwner = null
    }
    catch (error) {
      console.error('Error unsubscribing from budget:', error)
    }
  }

  const subscribeToBudget = subscribeToBudgetByUsername
  const unsubscribeFromBudget = unsubscribeFromBudgetByUsername

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    connect,
    disconnect,
    subscribeToBudget,
    unsubscribeFromBudget,
    subscribeToBudgetByUsername,
    unsubscribeFromBudgetByUsername,
  }
}
