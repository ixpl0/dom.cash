import type { EntryKind } from '~~/server/db/schema'

export type NotificationType
  = | 'budget_currency_changed'
    | 'budget_month_added'
    | 'budget_month_deleted'
    | 'budget_entry_created'
    | 'budget_entry_updated'
    | 'budget_entry_deleted'
    | 'budget_share_granted'
    | 'budget_share_revoked'
    | 'budget_share_updated'
    | 'budget_imported'

export type AccessLevel = 'read' | 'write'

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
}

export interface NotificationPayload {
  type: NotificationType
  params: NotificationParams
}
