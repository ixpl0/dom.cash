import { sqliteTable, integer, text, real, unique } from 'drizzle-orm/sqlite-core'

const createIncomeOrExpenseTable = (tableName: string) =>
  sqliteTable(tableName, {
    id: text('id').primaryKey(),
    userMonthId: text('user_month_id').notNull().references(() => userMonths.id),
    description: text('description').notNull(),
    amount: real('amount').notNull(),
    currency: text('currency').notNull(),
    date: text('date').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  })

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  token: text('token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
})

export const exchangeRates = sqliteTable('exchange_rates', {
  date: text('date').primaryKey(),
  rates: text('rates', { mode: 'json' }).notNull(),
})

export const userMonths = sqliteTable('user_months', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, table => [
  unique('unique_user_month').on(table.userId, table.year, table.month),
])

export const balanceSources = sqliteTable('balance_sources', {
  id: text('id').primaryKey(),
  userMonthId: text('user_month_id').notNull().references(() => userMonths.id),
  name: text('name').notNull(),
  currency: text('currency').notNull(),
  amount: real('amount').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const incomeEntries = createIncomeOrExpenseTable('income_entries')
export const expenseEntries = createIncomeOrExpenseTable('expense_entries')

export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => user.id),
  baseCurrency: text('base_currency').notNull().default('USD'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export type User = typeof user.$inferSelect
export type Session = typeof session.$inferSelect
export type ExchangeRates = typeof exchangeRates.$inferSelect
export type UserMonth = typeof userMonths.$inferSelect
export type BalanceSource = typeof balanceSources.$inferSelect
export type IncomeEntry = typeof incomeEntries.$inferSelect
export type ExpenseEntry = typeof expenseEntries.$inferSelect
export type UserSettings = typeof userSettings.$inferSelect
