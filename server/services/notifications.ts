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

const activeConnections = new Map<string, { write: (data: string) => void, close: () => void }>()
const budgetSubscriptions = new Map<string, Set<string>>()

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

const getBudgetSubscribers = (budgetOwnerId: string): string[] => {
  const subscribers = budgetSubscriptions.get(budgetOwnerId)
  return subscribers ? Array.from(subscribers) : []
}

const sendNotificationToUser = (userId: string, notification: NotificationEvent) => {
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
