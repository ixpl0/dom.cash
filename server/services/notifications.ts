export type NotificationType = 'budget_currency_changed' | 'budget_month_added' | 'budget_month_deleted' | 'budget_entry_created' | 'budget_entry_updated' | 'budget_entry_deleted' | 'budget_share_updated'

export interface CreateNotificationParams {
  sourceUserId: string
  budgetOwnerId: string
  type: NotificationType
  message: string
}

export interface NotificationEvent {
  id: string
  type: NotificationType
  message: string
  sourceUsername: string
  budgetOwnerUsername: string
  createdAt: Date
}

const activeConnections = new Map<string, { write: (data: string) => void, close: () => void }>()
const budgetSubscriptions = new Map<string, Set<string>>() // budgetOwnerId -> Set<subscribedUserId>

export const getActiveConnections = () => activeConnections
export const getBudgetSubscriptions = () => budgetSubscriptions

export const addConnection = (userId: string, connection: { write: (data: string) => void, close: () => void }) => {
  activeConnections.set(userId, connection)
}

export const removeConnection = (userId: string) => {
  activeConnections.delete(userId)

  for (const [budgetOwnerId, subscribers] of budgetSubscriptions.entries()) {
    if (subscribers.has(userId)) {
      subscribers.delete(userId)
      if (subscribers.size === 0) {
        budgetSubscriptions.delete(budgetOwnerId)
      }
    }
  }
}

export const subscribeToBudget = (userId: string, budgetOwnerId: string) => {
  if (!budgetSubscriptions.has(budgetOwnerId)) {
    budgetSubscriptions.set(budgetOwnerId, new Set())
  }
  budgetSubscriptions.get(budgetOwnerId)!.add(userId)
}

export const unsubscribeFromBudget = (userId: string, budgetOwnerId: string) => {
  const subscribers = budgetSubscriptions.get(budgetOwnerId)
  if (subscribers) {
    subscribers.delete(userId)
    if (subscribers.size === 0) {
      budgetSubscriptions.delete(budgetOwnerId)
    }
  }
}

export const getBudgetSubscribers = (budgetOwnerId: string): string[] => {
  const subscribers = budgetSubscriptions.get(budgetOwnerId)
  return subscribers ? Array.from(subscribers) : []
}

export const sendNotificationToUser = (userId: string, notification: NotificationEvent) => {
  const connection = activeConnections.get(userId)
  if (connection) {
    try {
      const data = `data: ${JSON.stringify(notification)}\n\n`
      connection.write(data)
    }
    catch (error) {
      console.error('Error sending notification to user:', error)
      removeConnection(userId)
    }
  }
}

export const createNotification = async (params: CreateNotificationParams): Promise<void> => {
  const subscribers = getBudgetSubscribers(params.budgetOwnerId)

  let targetUsers = [...subscribers]
  if (!targetUsers.includes(params.budgetOwnerId)) {
    targetUsers.push(params.budgetOwnerId)
  }

  targetUsers = targetUsers.filter(userId => userId !== params.sourceUserId)

  if (targetUsers.length === 0) {
    return
  }

  const notificationEvent: NotificationEvent = {
    id: crypto.randomUUID(),
    type: params.type,
    message: params.message,
    sourceUsername: 'unknown',
    budgetOwnerUsername: 'unknown',
    createdAt: new Date(),
  }

  for (const targetUserId of targetUsers) {
    sendNotificationToUser(targetUserId, notificationEvent)
  }
}
