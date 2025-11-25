import type { CurrencyRates, User as DBUser } from '~~/server/db/schema'

export type { Session, Month, Entry, EntryKind, CurrencyRates } from '~~/server/db/schema'

export type User = Pick<DBUser, 'id' | 'username' | 'mainCurrency' | 'isAdmin'>

export interface Currency {
  date: string
  rates: CurrencyRates
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface AdminUser {
  id: string
  username: string
  emailVerified: boolean
  isAdmin: boolean
  createdAt: Date
}

export interface AdminUsersResponse {
  users: AdminUser[]
  total: number
  page: number
  limit: number
}

export * from './export-import'
