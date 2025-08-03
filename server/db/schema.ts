import { sqliteTable, integer, text, real, unique } from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
})

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => user.id),
  mainCurrency: text('main_currency').notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  token: text('token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
})

export const currency = sqliteTable('currency', {
  date: text('date').primaryKey(),
  rates: text('rates', { mode: 'json' }).notNull(),
})

export const month = sqliteTable('month', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
}, table => [
  unique('unique_user_month').on(table.userId, table.year, table.month),
])

export const balance = createIncomeOrExpenseTable('balance')
export const income = createIncomeOrExpenseTable('income')
export const expense = createIncomeOrExpenseTable('expense')

export type User = typeof user.$inferSelect
export type Settings = typeof settings.$inferSelect
export type Session = typeof session.$inferSelect
export type Currency = typeof currency.$inferSelect
export type Month = typeof month.$inferSelect
export type Balance = typeof balance.$inferSelect
export type Income = typeof income.$inferSelect
export type Expense = typeof expense.$inferSelect

function createIncomeOrExpenseTable(tableName: string) {
  return sqliteTable(tableName, {
    id: text('id').primaryKey(),
    monthId: text('month_id').notNull().references(() => month.id),
    description: text('description').notNull(),
    amount: real('amount').notNull(),
    currency: text('currency').notNull(),
    date: text('date'),
  })
}
