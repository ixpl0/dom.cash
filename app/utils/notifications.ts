import type { NotificationEvent, NotificationType, Translate } from '~~/shared/types/i18n'

export type ServerMessage = { type: 'connected' } | { type: 'ping' } | NotificationEvent

export interface StaleStores {
  budget: boolean
  todo: boolean
  docs: boolean
}

const RECONNECT_DELAYS_MS = [1000, 5000, 15000, 30000, 60000]

const SILENT_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set(['docs_images_changed'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const parseServerMessage = (data: string): ServerMessage | null => {
  const message: unknown = JSON.parse(data)
  return isRecord(message) && typeof message.type === 'string' ? message as ServerMessage : null
}

export const getReconnectDelay = (failedAttempts: number): number =>
  RECONNECT_DELAYS_MS[Math.min(failedAttempts, RECONNECT_DELAYS_MS.length - 1)] ?? 60000

export const getStaleStores = (notification: NotificationEvent, shownBudgetOwnerId: string | null): StaleStores => ({
  budget: notification.type.startsWith('budget_') && notification.budgetOwnerId === shownBudgetOwnerId,
  todo: notification.type.startsWith('todo_') || notification.type.startsWith('budget_share_'),
  docs: notification.type.startsWith('docs_') || notification.type.startsWith('budget_share_'),
})

export const isSilentNotification = ({ type }: NotificationEvent): boolean => SILENT_NOTIFICATION_TYPES.has(type)

export const formatNotificationMessage = ({ type, params }: NotificationEvent, t: Translate): string => {
  const translatedParams: Record<string, string | number> = {
    ...(params.username ? { username: params.username } : {}),
    ...(params.currency ? { currency: params.currency } : {}),
    ...(params.year !== undefined ? { year: params.year } : {}),
    ...(params.description ? { description: params.description } : {}),
    ...(params.amount !== undefined ? { amount: params.amount } : {}),
    ...(params.entryCurrency ? { entryCurrency: params.entryCurrency } : {}),
    ...(params.monthsCount !== undefined ? { monthsCount: params.monthsCount } : {}),
    ...(params.entriesCount !== undefined ? { entriesCount: params.entriesCount } : {}),
    ...(params.month ? { month: t(`month.${params.month}`) } : {}),
    ...(params.kind ? { kind: t(`entryKind.${params.kind}`) } : {}),
    ...(params.access ? { access: t(`accessLevel.${params.access}`) } : {}),
    ...(params.todoContent ? { todoContent: params.todoContent } : {}),
    ...(params.isCompleted !== undefined
      ? { isCompleted: t(`todoStatus.${params.isCompleted ? 'completed' : 'incomplete'}`) }
      : {}),
    ...(params.folderName !== undefined ? { folderName: params.folderName } : {}),
    ...(params.documentTitle !== undefined ? { documentTitle: params.documentTitle.trim() || t('docs.document.untitled') } : {}),
  }

  return t(`notifications.${type}`, translatedParams)
}
