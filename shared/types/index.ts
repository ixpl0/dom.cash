export type { EntryKind, AccessLevel } from '~~/shared/schemas/common'

export interface User {
  id: string
  username: string
  mainCurrency: string
  isAdmin: boolean
  impersonatedBy?: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export type CodeRequestResult = { alreadySent: false } | { alreadySent: true, waitMinutes: number }

export interface AdminUser {
  id: string
  username: string
  emailVerified: boolean
  isAdmin: boolean
  createdAt: Date
  lastActivityAt: Date | null
}

export interface AdminUsersResponse {
  users: AdminUser[]
  total: number
  page: number
  limit: number
}

export interface RegistrationState {
  isOpen: boolean
  closesInSeconds: number | null
}

export * from './docs'
export * from './export-import'
export * from './mcp'
export * from './recurrence'
export * from './todo'
