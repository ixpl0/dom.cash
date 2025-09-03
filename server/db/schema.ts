import { sqliteTable, integer, text, unique, index, check } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

type Rates = Record<string, number>

export const user = sqliteTable(
  'user',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash'),
    googleId: text('google_id').unique(),
    mainCurrency: text('main_currency').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  t => [
    check('ck_user_currency_3_upper', sql`${t.mainCurrency} GLOB '[A-Z][A-Z][A-Z]'`),
    check('ck_user_has_auth', sql`${t.passwordHash} IS NOT NULL OR ${t.googleId} IS NOT NULL`),
  ],
)

export type User = typeof user.$inferSelect
export type NewUser = typeof user.$inferInsert

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  t => [
    index('idx_session_user').on(t.userId),
    index('idx_session_expires').on(t.expiresAt),
    check('ck_session_time_order', sql`${t.expiresAt} >= ${t.createdAt}`),
  ],
)

export type Session = typeof session.$inferSelect
export type NewSession = typeof session.$inferInsert

export const currency = sqliteTable(
  'currency',
  {
    date: text('date').primaryKey(),
    rates: text('rates', { mode: 'json' }).$type<Rates>().notNull(),
    lastUpdateAttempt: integer('last_update_attempt', { mode: 'timestamp' }),
  },
  t => [
    check('ck_currency_date_format', sql`${t.date} GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'`),
    check('ck_currency_rates_is_object', sql`${t.rates} GLOB '{*}'`),
  ],
)

export type Currency = typeof currency.$inferSelect
export type NewCurrency = typeof currency.$inferInsert
export type CurrencyRates = Currency['rates']

export const month = sqliteTable(
  'month',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
  },
  t => [
    unique('uq_user_year_month').on(t.userId, t.year, t.month),
    index('idx_month_user').on(t.userId),
    check('ck_month_range', sql`${t.month} between 0 and 11`),
  ],
)

export type Month = typeof month.$inferSelect
export type NewMonth = typeof month.$inferInsert

export const entry = sqliteTable(
  'entry',
  {
    id: text('id').primaryKey(),
    monthId: text('month_id').notNull().references(() => month.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['balance', 'income', 'expense'] }).notNull(),
    description: text('description').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    date: text('date'),
    isOptional: integer('is_optional', { mode: 'boolean' }),
  },
  t => [
    index('idx_entry_month').on(t.monthId),
    index('idx_entry_date').on(t.date),
    check('ck_amount_nonneg', sql`${t.amount} >= 0`),
    check('ck_entry_currency_3_upper', sql`${t.currency} GLOB '[A-Z][A-Z][A-Z]'`),
  ],
)

export type Entry = typeof entry.$inferSelect
export type NewEntry = typeof entry.$inferInsert
export type EntryKind = Entry['kind']

export const budgetShare = sqliteTable(
  'budget_share',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    sharedWithId: text('shared_with_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    access: text('access', { enum: ['read', 'write'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  t => [
    unique('uq_owner_shared_with').on(t.ownerId, t.sharedWithId),
    index('idx_budget_share_owner').on(t.ownerId),
    index('idx_budget_share_shared_with').on(t.sharedWithId),
    check('ck_no_self_share', sql`${t.ownerId} <> ${t.sharedWithId}`),
  ],
)

export type BudgetShare = typeof budgetShare.$inferSelect
export type NewBudgetShare = typeof budgetShare.$inferInsert
export type BudgetShareAccess = BudgetShare['access']
