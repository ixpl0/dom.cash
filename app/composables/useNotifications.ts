export interface NotificationEvent {
  id: string
  type: string
  message: string
  sourceUsername: string
  budgetOwnerUsername: string
  createdAt: string
}

export const useNotifications = () => {
  let eventSource: EventSource | null = null
  let currentBudgetOwner: string | null = null
  const isConnected = ref(false)

  const { toast } = useToast()
  const { showBanner } = useOutdatedBanner()

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
        const data = JSON.parse(event.data)

        if (data.type === 'connected') {
          isConnected.value = true
          return
        }

        if (data.type === 'ping') {
          return
        }

        console.log('🔔 Получено уведомление:', data.message)

        toast({
          type: 'info',
          message: data.message,
          timeout: 4000,
        })

        showBanner()
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
