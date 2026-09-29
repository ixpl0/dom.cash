# dom.cash - Budget Tracker

Приложение для учёта личных финансов с поддержкой множественных валют, задачами и разделом «Доки»: фото документов с полями, которые распознаёт ИИ.
Deployed on Cloudflare Workers with D1 database.

## Architecture Overview

### Server

- **API handlers** (`server/api/`) parse the request, check access and call services.
- **Services** (`server/services/`) hold the business logic and database access. They receive the H3 event to reach D1.
- **Shared code** (`shared/`) holds Zod schemas, types and pure calculations used by both the server and the client.

Deferred work and the decisions not to change things are listed in `FOLLOWUPS.md`.

### Testing Strategy

#### Unit Tests

Unit tests run on the Node.js test runner through `tsx`, without a dev server or external services:

```bash
pnpm test:unit
```

Tests live in `tests/unit/`. They cover budget calculations, month helpers, recurrence, Zod schemas, currency formatting, exchange rates, notifications, back navigation and the docs section (services against a fake R2 bucket, the Claude request against a fake API).

```bash
# Type-check unit and e2e tests
pnpm typecheck:tests

# Lint, type-check the app and the tests, run unit tests
pnpm check
```

#### E2E Tests

The application uses **Playwright** for end-to-end testing:

- **Server**: `pnpm test:e2e` builds the app in e2e mode (`.output-e2e`) and serves it with `wrangler dev` on port 8787, the same runtime as production.
- **Database**: every run starts from an empty local D1 in `.wrangler/e2e` with all migrations; it never touches the data of `pnpm dev`.
- **Test mode**: the e2e build and `nuxt dev` use the verification code `111111`, log codes instead of emailing them and expose `/api/test/*`. Production builds contain none of this.
- **Users**: every worker registers its own test user and reuses its session.
- **Browser**: Desktop Chrome.
- **Isolation**: authenticated tests delete the user's budget data and todos after each test.
- **Cleanup**: the global teardown deletes all test users (`test_*@example.com`).

##### Структура тестов

- `tests/e2e/public/` - тесты для публичных страниц (без аутентификации)
- `tests/e2e/authenticated/` - тесты для аутентифицированных пользователей
  - `budget/` - тесты бюджета и модальных окон
  - `todo/` - тесты задач
  - `docs/` - тесты раздела «Доки» (папки, документы, фото, распознавание через тестовый распознаватель)
- `tests/e2e/helpers/` - вспомогательные функции (auth, confirmation, budget-setup, docs, wait-for-hydration, text, users)
- `tests/e2e/fixtures.ts` - фикстуры Playwright
- `tests/e2e/global-setup.ts`, `tests/e2e/global-teardown.ts` - подготовка и очистка тестовых данных

##### Запуск тестов

```bash
# Сборка в e2e-режиме и запуск всех e2e тестов
pnpm run test:e2e

# Запуск против dev-сервера (pnpm preview:e2e) — удобно, когда пишешь тест
pnpm run test:e2e:dev

# Запуск в режиме отладки с UI (против dev-сервера)
pnpm run test:e2e:ui

# Запуск тестов с видимым браузером (против dev-сервера)
pnpm run test:e2e:headed
```

Тесты против dev-сервера пишут в ту же локальную D1, что и `pnpm dev`; тестовых пользователей удаляет global teardown. Dev-сервер для тестов (`pnpm preview:e2e`) читает `.env.e2e` вместо `.env` — обычно такого файла нет, поэтому настоящие ключи (Claude, курсы валют, почта) в тесты не попадают, как и в `pnpm test:e2e`, а распознавание отвечает тестовым распознавателем.

##### Покрытие тестами

- **Публичные страницы** - главная, авторизация, восстановление пароля, переключение темы и языка
- **Страница бюджета** - CRUD операции, модальные окна (entry, share, shared budgets, confirmation), импорт/экспорт
- **Страница задач (Todo)** - создание, редактирование, удаление задач
- **Раздел «Доки»** - папки, документы, поля, загрузка фото, просмотр, распознавание, копирование
- **Общие компоненты** - header, выход из системы

### Frontend Architecture Principles

#### Server-Side Rendering (SSR)
- Budget and todo data are fetched during SSR and hydrated on the client.
- Older budget years load on demand.

#### API Calls in SSR Context
- **useFetch for SSR** - Use `useFetch` for GET requests that need cookie/header forwarding during SSR
- **$fetch for client operations** - Use `$fetch` for client-only POST/PUT/DELETE operations
- **Cloudflare Workers compatibility** - `$fetch` doesn't properly forward cookies during SSR in CF Workers

#### Local State Updates
- After a successful request the store patches its state with the server response instead of reloading everything.
- A failed request shows a toast and keeps the data that is already loaded.

#### Dynamic Column Width Synchronization
Budget timeline implements **responsive column width synchronization**:

- **Content-based sizing** - columns automatically adjust to fit the widest content
- **Cross-row synchronization** - all rows maintain uniform column widths
- **Dynamic updates** - responds to content changes via ResizeObserver and reactive watchers
- **Smooth animations** - animated transitions between width changes
- **Flexible content containers** - inner elements (.column-content) with `w-fit` maintain natural sizing while parent containers receive synchronized fixed widths

#### CSS Architecture

Styles are split into logical CSS files in `app/assets/`:

- **base.css** - CSS reset and base styles
- **themes.css** - DaisyUI theme customizations
- **components.css** - Custom component styles
- **animations.css** - Keyframe animations
- **transitions.css** - Vue transition definitions
- **app.css** - Main entry point that imports all CSS files

## Tech Stack

- **Framework**: Nuxt 4, Vue 3
- **Backend**: Nitro, Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **File storage**: Cloudflare R2 (photos of documents in the docs section)
- **AI**: Claude Sonnet 5.5 through the official `@anthropic-ai/sdk` (reading fields from photos of documents)
- **Authentication**: random session tokens stored as SHA-256 hashes in D1, HTTP-only cookies, sliding 90-day sessions, Google OAuth
- **Styling**: Tailwind CSS 4 + DaisyUI 5
- **Type Safety**: TypeScript 5 with strict mode
- **Validation**: Zod for runtime type checking
- **State Management**: Pinia
- **Charts**: Vue ECharts
- **Internationalization**: @nuxtjs/i18n (Russian, English)
- **Deployment**: Cloudflare Workers

## Getting Started

### Prerequisites

- Node.js 22.16+ (see `.nvmrc`)
- pnpm 10+
- Wrangler CLI (for Cloudflare deployment)

### Installation

```bash
pnpm install
```

### Database Setup

```bash
# Apply migrations to local database
pnpm run db:migrate

# Or reset database completely (deletes all data!)
pnpm run db:reset
```

### Development

```bash
pnpm run dev
```

Visit `http://localhost:3000`

### Environment Variables

The server reads every setting from `process.env`. Locally `nuxt dev` fills it from `.env` (see `.env.example`): `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `OPENEXCHANGERATES_APP_ID`, `RESEND_API_KEY`, `DISABLE_EMAIL_VERIFICATION`, `ANTHROPIC_API_KEY`. In development codes are logged instead of emailed, so `RESEND_API_KEY` is only needed on deployed Workers.

On deployed Workers the settings are secrets (`wrangler secret put NAME`). Workers expose secrets through `process.env` because `nodejs_compat` is enabled in `wrangler.toml`.

#### DISABLE_EMAIL_VERIFICATION

Disables mandatory email verification during registration. Useful for development and testing.

- **Unset or empty** (default): registration requires email confirmation via verification code.
- **Any non-empty value**: registration happens immediately without sending a code. The user is created with `emailVerified = false`.

All users have an `emailVerified` field, so verification can be required later from users who skipped it.

#### ANTHROPIC_API_KEY

The key of the Claude API that reads fields from photos in the docs section. Create it in the Claude Console (platform.claude.com, Settings → API keys). API usage is billed there, separately from a claude.ai subscription; one document costs a few cents.

- **Unset**: recognition is off, the interface hides it and says it is not set up. Photos and fields still work.
- **Set**: `server/services/docs/recognizer.ts` uploads the previews of the photos to the Files API (they expire after an hour and are deleted right after the answer) and asks `claude-sonnet-5-5` with effort `medium` for the fields.
- **Test mode without a key** (`nuxt dev` and the e2e build): a fake recognizer returns the fields "Test mode" and "Photos read", so the whole flow can be checked without the API.

#### Google OAuth

**Setup in Google Cloud Console**:
1. Create a new project or select an existing one
2. Configure OAuth consent screen
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `https://your-domain.com/api/auth/google-redirect`

## Docs Section Setup

The docs section keeps the photos of documents in Cloudflare R2 (binding `DOCS_BUCKET` in `wrangler.toml`) and the folders, documents and fields in D1. Before the first release:

1. Enable R2 in the Cloudflare dashboard (R2 Object Storage; the free tier covers 10 GB).
2. Create the buckets (their names are in `wrangler.toml`):

   ```bash
   pnpm exec wrangler r2 bucket create dom-docs-test
   pnpm exec wrangler r2 bucket create dom-docs-prod
   ```

3. Add the Claude API key as a secret of both Workers:

   ```bash
   pnpm exec wrangler secret put ANTHROPIC_API_KEY --env=""
   pnpm exec wrangler secret put ANTHROPIC_API_KEY --env="production"
   ```

4. Release as usual: `pnpm run release:test`, then `pnpm run release:prod` (they apply migration `0021_create_docs_tables.sql`).

Locally nothing is needed except `ANTHROPIC_API_KEY` in `.env`: `nuxt dev` and `wrangler dev` keep R2 in `.wrangler/`. The buckets stay private; photos are served only by `/api/docs/images/:id/:variant` after an access check.

## Database Migrations

This project uses **Wrangler D1 migrations** for Cloudflare deployment (NOT Drizzle migrations).

### How Migrations Work

- **Schema** is defined in `server/db/schema.ts` (Drizzle ORM)
- **Migration files** are in `migrations/` directory (plain SQL)
- **Wrangler** tracks which migrations have been applied

### Creating New Migrations

```bash
# Create a new migration file
wrangler d1 migrations create DB migration_name
```

This creates a numbered file in `migrations/`.

### Applying Migrations

```bash
# Local development
pnpm run db:migrate

# Test environment (remote)
pnpm run db:migrate:test

# Production environment (remote)
pnpm run db:migrate:prod
```

### Current Migrations

- `0001_create_tables.sql` - All database tables
- `0002_seed_currency_rates.sql` - Initial currency rates data
- `0003_fix_august_2025_rates.sql` - Fix currency rates for August 2025
- `0004_add_is_optional_to_entry.sql` - Add is_optional field to entry table
- `0005_add_email_verification_codes.sql` - Add email verification codes table
- `0006_add_attempt_count_to_verification_codes.sql` - Add attempt tracking to verification codes
- `0007_add_email_verified_to_user.sql` - Add email_verified field to user table
- `0008_add_is_admin_to_user.sql` - Add is_admin field to user table
- `0009_add_verify_attempt_count.sql` - Add verification attempt counter
- `0010_add_last_activity_at_to_user.sql` - Add last activity timestamp to user
- `0011_create_memo_tables.sql` - Create memo (todo) tables
- `0012_update_memo_datetime.sql` - Update memo datetime format
- `0013_remove-memo-type-field.sql` - Remove memo type field
- `0014_rename_memo_to_todo.sql` - Rename memo to todo
- `0015_add_todo_recurrence.sql` - Add recurring todos support
- `0016_add_planned_balance_change_to_month.sql` - Add planned balance change to month
- `0017_create_plan_table.sql` - Move plans into a separate table
- `0018_allow_null_plan_amount.sql` - Allow plans without an amount
- `0019_add_comment_to_plan.sql` - Add a comment to plans
- `0020_create_app_settings.sql` - Store whether registration is open
- `0021_create_docs_tables.sql` - Folders, shares, documents and photos of the docs section

### Database Commands

| Command | Purpose | Environment |
|---------|---------|-------------|
| `pnpm run db:migrate` | Apply migrations | Local |
| `pnpm run db:migrate:test` | Apply migrations | Test (remote) |
| `pnpm run db:migrate:prod` | Apply migrations | Production (remote) |
| `pnpm run db:backup` | Create backup `backups/backup-local-<UTC time>.sql` | Local |
| `pnpm run db:backup:test` | Create backup `backups/backup-test-<UTC time>.sql` | Test (remote) |
| `pnpm run db:backup:prod` | Create backup `backups/backup-prod-<UTC time>.sql` | Production (remote) |
| `pnpm run db:reset` | Reset database | Local only |

### Important Notes

- **NO Drizzle-kit generate** - we use Wrangler D1 migrations
- **Manual SQL** - write migrations manually in SQL
- **Test first** - always test migrations locally before deploying
- **Never drop a referenced table** - SQLite deletes child rows of `ON DELETE CASCADE` references
- **Commit migrations** to version control

## Code Quality

```bash
# Lint, type-check the app and the tests, run unit tests
pnpm run check

# Run TypeScript checks
pnpm run typecheck

# Run linting
pnpm run lint

# Auto-fix ESLint issues
pnpm run lint:fix
```

GitHub Actions runs `pnpm run check` on pushes to `main` and on pull requests. Every deploy script runs it before building.

### Deploy Commands

```bash
# Deploy to test
pnpm run deploy:test

# Deploy to production
pnpm run deploy:prod

# Deploy to both
pnpm run deploy:all
```

A release checks and builds the app first, then backs up the database, applies the migrations and deploys:

```bash
pnpm run release:test
pnpm run release:prod
```

Production runs at `https://domcash.ixplo.ai`.

## Project Structure

```
├── app/
│   ├── assets/         # CSS files (base, themes, components, animations, transitions)
│   ├── components/     # Vue components organized by feature
│   ├── composables/    # Vue composables organized by feature
│   ├── pages/          # Nuxt pages (index, auth, budget, metrics, todo, docs)
│   ├── stores/         # Pinia state management organized by feature
│   ├── layouts/        # Page layouts
│   ├── middleware/     # Nuxt middleware
│   ├── plugins/        # Nuxt plugins
│   └── utils/          # Frontend utilities
├── server/
│   ├── api/            # API handlers
│   ├── services/       # Business logic and database access
│   ├── db/             # Database schema and connection
│   ├── middleware/     # Server middleware
│   └── utils/          # Backend utilities (auth, validation, rates, logging)
├── shared/
│   ├── types/          # Shared TypeScript types
│   ├── schemas/        # Shared Zod schemas
│   └── utils/          # Shared business logic
├── i18n/
│   └── locales/        # Translation files (ru, en)
├── tests/
│   ├── unit/           # Unit tests
│   └── e2e/            # Playwright tests
├── migrations/         # Wrangler D1 SQL migrations
```

## Known Issues

### Real-time Notifications (SSE) Across Worker Instances

Active SSE connections and budget subscriptions live in module-level `Map` objects (`server/services/notifications.ts`). Cloudflare may run several Worker instances, and an event created in one instance does not reach connections held by another. This limitation is accepted: delivery is best-effort, and data older than 15 minutes is reloaded anyway.

## Contributing

### Development Guidelines

1. **Services** - business logic and database access go to `server/services/`
2. **Handlers** - keep API handlers thin: parse, check access, call a service
3. **TypeScript** - follow strict mode, no `any` types
4. **Code Style** - see `AGENTS.md`

### Before Submitting PR

```bash
pnpm run check
```

## Internationalization (i18n)

The application supports multiple languages:

- **Russian (ru)** - default for Russian-speaking users
- **English (en)** - default language

### Configuration

- Language detection: browser preference with cookie persistence
- Strategy: `no_prefix` (language stored in cookie, not URL)
- Cookie name: `i18n_locale`

### Adding Translations

Translation files are located in `i18n/locales/`:

```
i18n/
├── locales/
│   ├── ru.ts           # Russian translations
│   ├── en.ts           # English translations
│   └── currencies/     # Currency name translations
│       ├── ru.ts
│       └── en.ts
```

### Usage in Components

```vue
<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <p>{{ t('welcome') }}</p>
</template>
```

## Themes

The application ships DaisyUI themes defined in `app/assets/themes.css`: kekdark, kekdarker, keklight, keklighter, summerhaze, ritualhabitual, crystalclear, grayscale and grayscaledark. The default `auto` follows the system color scheme.

### Theme Switching

Theme preference is stored in cookies (for SSR support) and applied via the `data-theme` attribute on the HTML element. Users can switch themes using the theme switcher in the header.
