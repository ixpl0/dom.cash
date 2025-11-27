export interface NotificationEvent {
  id: string
  type: string
  message: string
  sourceUserId: string
  sourceUsername: string
  budgetOwnerUsername: string
  createdAt: string
}

export const useNotifications = () => {
  let websocket: WebSocket | null = null
  let currentBudgetOwnerId: string | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  const isConnected = ref(false)

  const { toast } = useToast()
  const { showWarningBanner } = useOutdatedBanner()

  const connect = (budgetOwnerId: string) => {
    if (websocket) {
      disconnect()
    }

    currentBudgetOwnerId = budgetOwnerId

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/notifications/ws/${budgetOwnerId}`

    websocket = new WebSocket(url)

    websocket.onopen = () => {
      isConnected.value = true
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
    }

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as { type: string, message?: string }

        if (data.type === 'connected') {
          isConnected.value = true
          return
        }

        if (data.type === 'ping') {
          return
        }

        if (data.message) {
          toast({ message: data.message })
        }
        showWarningBanner()
      }
      catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    websocket.onclose = () => {
      isConnected.value = false
      websocket = null

      if (currentBudgetOwnerId && !reconnectTimeout) {
        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null
          if (currentBudgetOwnerId) {
            connect(currentBudgetOwnerId)
          }
        }, 5000)
      }
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
      isConnected.value = false
    }
  }

  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (websocket) {
      websocket.close()
      websocket = null
      isConnected.value = false
    }

    currentBudgetOwnerId = null
  }

  const subscribeToBudget = (budgetOwnerId: string) => {
    if (currentBudgetOwnerId === budgetOwnerId && websocket?.readyState === WebSocket.OPEN) {
      return
    }
    connect(budgetOwnerId)
  }

  const unsubscribeFromBudget = () => {
    disconnect()
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    subscribeToBudget,
    unsubscribeFromBudget,
  }
}
