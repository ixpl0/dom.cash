export interface NotificationEvent {
  id: string
  type: string
  message: string
  sourceUsername: string
  budgetOwnerUsername: string
  createdAt: string
}

export const useNotifications = () => {
  const notifications = ref<NotificationEvent[]>([])
  let eventSource: EventSource | null = null
  let currentBudgetOwner: string | null = null

  const connect = () => {
    if (eventSource) {
      disconnect()
    }

    eventSource = new EventSource('/api/notifications/events')

    eventSource.onopen = () => {
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'connected') {
          return
        }

        if (data.type === 'ping') {
          return
        }

        const notification: NotificationEvent = {
          id: data.id,
          type: data.type,
          message: data.message,
          sourceUsername: data.sourceUsername,
          budgetOwnerUsername: data.budgetOwnerUsername,
          createdAt: data.createdAt,
        }

        console.log('🔔 Получено уведомление:', notification.message)
        notifications.value.unshift(notification)
      }
      catch (error) {
        console.error('Error parsing event data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Error connecting to event source:', error)
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
    }
  }

  const dismissNotification = (notificationId: string) => {
    notifications.value = notifications.value.filter(n => n.id !== notificationId)
  }

  const clearAllNotifications = () => {
    notifications.value = []
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
    notifications: readonly(notifications),
    connect,
    disconnect,
    dismissNotification,
    clearAllNotifications,
    subscribeToBudget,
    unsubscribeFromBudget,
    subscribeToBudgetByUsername,
    unsubscribeFromBudgetByUsername,
  }
}
