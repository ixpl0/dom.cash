import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('./database.sqlite')
export const db = drizzle(sqlite, { schema })

export const initializeDatabase = () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id),
      expires_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS exchange_rates (
      date TEXT PRIMARY KEY,
      rates TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS user_months (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id),
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(user_id, year, month)
    )`,
    `CREATE TABLE IF NOT EXISTS balance_sources (
      id TEXT PRIMARY KEY,
      user_month_id TEXT NOT NULL REFERENCES user_months(id),
      name TEXT NOT NULL,
      currency TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS income_entries (
      id TEXT PRIMARY KEY,
      user_month_id TEXT NOT NULL REFERENCES user_months(id),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS expense_entries (
      id TEXT PRIMARY KEY,
      user_month_id TEXT NOT NULL REFERENCES user_months(id),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES user(id),
      base_currency TEXT NOT NULL DEFAULT 'USD',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  ]

  tables.forEach((table) => {
    sqlite.exec(table)
  })
}

export { schema }
