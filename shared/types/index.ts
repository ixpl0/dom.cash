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

export * from './export-import'
