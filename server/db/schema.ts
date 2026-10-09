import { sqliteTable, integer, text, unique, index, check } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import type { DocField } from '~~/shared/types/docs'
import type { RecurrencePattern } from '~~/shared/types/recurrence'
import { ACCESS_LEVELS, ENTRY_KINDS } from '~~/shared/schemas/common'
import type { McpScope } from '~~/shared/schemas/mcp'
import { TODO_DIGEST_OVERDUE_MODES, TODO_DIGEST_UNDATED_MODES } from '~~/shared/schemas/push'
import { SUPPORTED_LOCALES } from '~~/shared/utils/shared/locale'

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
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
    lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }),
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

export const OAUTH_TOKEN_KINDS = ['access', 'refresh'] as const

export const oauthClient = sqliteTable(
  'oauth_client',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    redirectUris: text('redirect_uris', { mode: 'json' }).$type<string[]>().notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  t => [
    check('ck_oauth_client_redirect_uris_is_array', sql`${t.redirectUris} GLOB '[[]*]'`),
  ],
)

export type OAuthClientRow = typeof oauthClient.$inferSelect

export const oauthAuthorizationCode = sqliteTable(
  'oauth_authorization_code',
  {
    codeHash: text('code_hash').primaryKey(),
    clientId: text('client_id').notNull().references(() => oauthClient.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    redirectUri: text('redirect_uri').notNull(),
    codeChallenge: text('code_challenge').notNull(),
    scopes: text('scopes', { mode: 'json' }).$type<McpScope[]>().notNull(),
    resource: text('resource'),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  t => [
    index('idx_oauth_authorization_code_expires').on(t.expiresAt),
    check('ck_oauth_authorization_code_scopes_is_array', sql`${t.scopes} GLOB '[[]*]'`),
  ],
)

export type OAuthAuthorizationCodeRow = typeof oauthAuthorizationCode.$inferSelect

export const oauthGrant = sqliteTable(
  'oauth_grant',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    clientId: text('client_id').notNull().references(() => oauthClient.id, { onDelete: 'cascade' }),
    scopes: text('scopes', { mode: 'json' }).$type<McpScope[]>().notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
  },
  t => [
    index('idx_oauth_grant_user').on(t.userId),
    index('idx_oauth_grant_client').on(t.clientId),
    check('ck_oauth_grant_scopes_is_array', sql`${t.scopes} GLOB '[[]*]'`),
  ],
)

export type OAuthGrantRow = typeof oauthGrant.$inferSelect

export const oauthToken = sqliteTable(
  'oauth_token',
  {
    tokenHash: text('token_hash').primaryKey(),
    grantId: text('grant_id').notNull().references(() => oauthGrant.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: OAUTH_TOKEN_KINDS }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  t => [
    index('idx_oauth_token_grant').on(t.grantId),
    index('idx_oauth_token_expires').on(t.expiresAt),
    check('ck_oauth_token_kind', sql`${t.kind} IN ('access', 'refresh')`),
  ],
)

export type OAuthTokenRow = typeof oauthToken.$inferSelect

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

export const plan = sqliteTable(
  'plan',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    plannedBalanceChange: integer('planned_balance_change'),
    comment: text('comment'),
  },
  t => [
    unique('uq_plan_user_year_month').on(t.userId, t.year, t.month),
    index('idx_plan_user').on(t.userId),
    check('ck_plan_month_range', sql`${t.month} between 0 and 11`),
  ],
)

export type Plan = typeof plan.$inferSelect
export type NewPlan = typeof plan.$inferInsert

export const entry = sqliteTable(
  'entry',
  {
    id: text('id').primaryKey(),
    monthId: text('month_id').notNull().references(() => month.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ENTRY_KINDS }).notNull(),
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

export const budgetShare = sqliteTable(
  'budget_share',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    sharedWithId: text('shared_with_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    access: text('access', { enum: ACCESS_LEVELS }).notNull(),
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

export const emailVerificationCode = sqliteTable(
  'email_verification_codes',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    code: text('code').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastSentAt: integer('last_sent_at', { mode: 'timestamp' }),
    verifyAttemptCount: integer('verify_attempt_count').notNull().default(0),
  },
  t => [
    index('idx_verification_email').on(t.email),
    index('idx_verification_expires').on(t.expiresAt),
  ],
)

export type EmailVerificationCode = typeof emailVerificationCode.$inferSelect
export type NewEmailVerificationCode = typeof emailVerificationCode.$inferInsert

export const todo = sqliteTable(
  'todo',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
    plannedDate: text('planned_date'),
    recurrence: text('recurrence', { mode: 'json' }).$type<RecurrencePattern | null>(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  t => [
    index('idx_todo_user').on(t.userId),
  ],
)

export type Todo = typeof todo.$inferSelect
export type NewTodo = typeof todo.$inferInsert

export const todoShare = sqliteTable(
  'todo_share',
  {
    id: text('id').primaryKey(),
    todoId: text('todo_id').notNull().references(() => todo.id, { onDelete: 'cascade' }),
    sharedWithId: text('shared_with_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  t => [
    unique('uq_todo_shared_with').on(t.todoId, t.sharedWithId),
    index('idx_todo_share_todo').on(t.todoId),
    index('idx_todo_share_user').on(t.sharedWithId),
  ],
)

export type TodoShare = typeof todoShare.$inferSelect
export type NewTodoShare = typeof todoShare.$inferInsert

export const pushSubscription = sqliteTable(
  'push_subscription',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').notNull().references(() => session.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  t => [
    unique('uq_push_subscription_endpoint').on(t.endpoint),
    index('idx_push_subscription_user').on(t.userId),
    index('idx_push_subscription_session').on(t.sessionId),
  ],
)

export type PushSubscriptionRow = typeof pushSubscription.$inferSelect

export const todoDigestSettings = sqliteTable(
  'todo_digest_settings',
  {
    userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
    digestTime: integer('digest_time').notNull(),
    weekdays: text('weekdays', { mode: 'json' }).$type<number[]>().notNull(),
    overdueMode: text('overdue_mode', { enum: TODO_DIGEST_OVERDUE_MODES }).notNull(),
    timeZone: text('time_zone').notNull(),
    locale: text('locale', { enum: SUPPORTED_LOCALES }).notNull(),
    lastSentDate: text('last_sent_date'),
    undatedMode: text('undated_mode', { enum: TODO_DIGEST_UNDATED_MODES }).notNull(),
    lastUndatedDate: text('last_undated_date'),
  },
  t => [
    check('ck_todo_digest_time', sql`${t.digestTime} BETWEEN 0 AND 1439`),
    check('ck_todo_digest_weekdays_is_array', sql`${t.weekdays} GLOB '[[]*]'`),
    check('ck_todo_digest_overdue_mode', sql`${t.overdueMode} IN ('fading', 'daily', 'off')`),
    check('ck_todo_digest_undated_mode', sql`${t.undatedMode} IN ('off', 'weekly', 'monthly')`),
  ],
)

export type TodoDigestSettingsRow = typeof todoDigestSettings.$inferSelect

export const docFolder = sqliteTable(
  'doc_folder',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  t => [
    index('idx_doc_folder_user').on(t.userId),
  ],
)

export type DocFolder = typeof docFolder.$inferSelect

export const docFolderShare = sqliteTable(
  'doc_folder_share',
  {
    id: text('id').primaryKey(),
    folderId: text('folder_id').notNull().references(() => docFolder.id, { onDelete: 'cascade' }),
    sharedWithId: text('shared_with_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  t => [
    unique('uq_doc_folder_shared_with').on(t.folderId, t.sharedWithId),
    index('idx_doc_folder_share_folder').on(t.folderId),
    index('idx_doc_folder_share_user').on(t.sharedWithId),
  ],
)

export const docDocument = sqliteTable(
  'doc_document',
  {
    id: text('id').primaryKey(),
    folderId: text('folder_id').notNull().references(() => docFolder.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    fields: text('fields', { mode: 'json' }).$type<DocField[]>().notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  t => [
    index('idx_doc_document_folder').on(t.folderId),
    check('ck_doc_document_fields_is_array', sql`${t.fields} GLOB '[[]*]'`),
  ],
)

export type DocDocumentRow = typeof docDocument.$inferSelect

export const docImage = sqliteTable(
  'doc_image',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id').notNull().references(() => docDocument.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    fileName: text('file_name').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    storedSize: integer('stored_size').notNull(),
    width: integer('width'),
    height: integer('height'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  t => [
    index('idx_doc_image_document').on(t.documentId),
    check('ck_doc_image_sizes', sql`${t.size} > 0 AND ${t.storedSize} >= ${t.size}`),
  ],
)

export type DocImageRow = typeof docImage.$inferSelect

export const appSettings = sqliteTable(
  'app_settings',
  {
    id: integer('id').primaryKey(),
    registrationOpen: integer('registration_open', { mode: 'boolean' }).notNull().default(true),
    registrationOpenUntil: integer('registration_open_until', { mode: 'timestamp' }),
  },
  t => [
    check('ck_app_settings_single_row', sql`${t.id} = 1`),
  ],
)
