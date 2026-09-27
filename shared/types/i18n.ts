import type { AccessLevel, EntryKind } from '~~/shared/schemas/common'

export type Translate = (key: string, params?: Record<string, string | number>) => string

export type NotificationType
  = | 'budget_currency_changed'
    | 'budget_month_added'
    | 'budget_month_deleted'
    | 'budget_entry_created'
    | 'budget_entry_updated'
    | 'budget_entry_deleted'
    | 'budget_plan_updated'
    | 'budget_share_granted'
    | 'budget_share_revoked'
    | 'budget_share_updated'
    | 'budget_imported'
    | 'todo_created'
    | 'todo_updated'
    | 'todo_deleted'
    | 'todo_toggled'

export type MonthKey
  = | 'january'
    | 'february'
    | 'march'
    | 'april'
    | 'may'
    | 'june'
    | 'july'
    | 'august'
    | 'september'
    | 'october'
    | 'november'
    | 'december'

export const MONTH_KEYS: readonly MonthKey[] = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

export interface NotificationParams {
  username?: string
  currency?: string
  month?: MonthKey
  year?: number
  description?: string
  kind?: EntryKind
  amount?: number
  entryCurrency?: string
  access?: AccessLevel
  monthsCount?: number
  entriesCount?: number
  todoContent?: string
  isCompleted?: boolean
}

export interface NotificationPayload {
  type: NotificationType
  params: NotificationParams
}

export interface NotificationEvent extends NotificationPayload {
  id: string
  budgetOwnerId: string
  createdAt: string
}
