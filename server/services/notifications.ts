import type { NotificationType, NotificationParams } from '~~/shared/types/i18n'

export type { NotificationType }

export interface CreateNotificationParams {
  sourceUserId: string
  budgetOwnerId: string
  type: NotificationType
  params: NotificationParams
  targetUserId?: string
}

export interface NotificationEvent {
  id: string
  type: NotificationType
  params: NotificationParams
  createdAt: Date
}

interface NotificationConnection {
  write: (data: string) => void
  close: () => void
}

const activeConnections = new Map<string, Map<string, NotificationConnection>>()
const budgetSubscriptions = new Map<string, Set<string>>()

const removeUserSubscriptions = (userId: string): void => {
  for (const [budgetOwnerId, subscribers] of budgetSubscriptions.entries()) {
    if (subscribers.has(userId)) {
      subscribers.delete(userId)
      if (subscribers.size === 0) {
        budgetSubscriptions.delete(budgetOwnerId)
      }
    }
  }
}

export const addConnection = (
  userId: string,
  connectionId: string,
  connection: NotificationConnection,
): void => {
  const userConnections = activeConnections.get(userId)

  if (!userConnections) {
    activeConnections.set(userId, new Map([[connectionId, connection]]))
    return
  }

  userConnections.set(connectionId, connection)
}

export const removeConnection = (userId: string, connectionId: string): void => {
  const userConnections = activeConnections.get(userId)

  if (!userConnections) {
    return
  }

  userConnections.delete(connectionId)

  if (userConnections.size > 0) {
    return
  }

  activeConnections.delete(userId)
  removeUserSubscriptions(userId)
}

export const subscribeToBudget = (userId: string, budgetOwnerId: string): void => {
  if (!budgetSubscriptions.has(budgetOwnerId)) {
    budgetSubscriptions.set(budgetOwnerId, new Set())
  }
  budgetSubscriptions.get(budgetOwnerId)!.add(userId)
}

export const unsubscribeFromBudget = (userId: string, budgetOwnerId: string): void => {
  const subscribers = budgetSubscriptions.get(budgetOwnerId)
  if (subscribers) {
    subscribers.delete(userId)
    if (subscribers.size === 0) {
      budgetSubscriptions.delete(budgetOwnerId)
    }
  }
}

const getBudgetSubscribers = (budgetOwnerId: string): string[] => {
  const subscribers = budgetSubscriptions.get(budgetOwnerId)
  return subscribers ? Array.from(subscribers) : []
}

const sendNotificationToUser = (userId: string, notification: NotificationEvent): void => {
  const userConnections = activeConnections.get(userId)

  if (!userConnections || userConnections.size === 0) {
    return
  }

  for (const [connectionId, connection] of userConnections.entries()) {
    try {
      const data = `data: ${JSON.stringify(notification)}\n\n`
      connection.write(data)
    }
    catch (error) {
      console.error('Error sending notification to user:', error)
      removeConnection(userId, connectionId)
    }
  }
}

export const createNotification = async (notificationParams: CreateNotificationParams): Promise<void> => {
  let targetUsers: string[]

  if (notificationParams.targetUserId) {
    targetUsers = [notificationParams.targetUserId]
  }
  else {
    const subscribers = getBudgetSubscribers(notificationParams.budgetOwnerId)
    targetUsers = [...subscribers]
    if (!targetUsers.includes(notificationParams.budgetOwnerId)) {
      targetUsers.push(notificationParams.budgetOwnerId)
    }
    targetUsers = targetUsers.filter(userId => userId !== notificationParams.sourceUserId)
  }

  if (targetUsers.length === 0) {
    return
  }

  const notificationEvent: NotificationEvent = {
    id: crypto.randomUUID(),
    type: notificationParams.type,
    params: notificationParams.params,
    createdAt: new Date(),
  }

  for (const targetUserId of targetUsers) {
    sendNotificationToUser(targetUserId, notificationEvent)
  }
}
