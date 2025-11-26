# dom.cash - Budget Tracker

Приложение для учёта личных финансов с поддержкой множественных валют.
Deployed on Cloudflare Workers with D1 database.

## Architecture Overview

### "Thin Handlers" Architecture

The application implements **Thin Handlers with Clean Services** pattern:

- **Thin API handlers** - minimal adapters that handle HTTP concerns (auth, validation, error formatting)
- **Pure business logic services** - all domain logic in `server/services/` directory
- **Complete separation of concerns** - HTTP layer separate from business logic
- **Framework independence** - services are pure functions, easily testable and portable

### Testing Strategy

#### E2E Tests

Приложение использует **Playwright** для end-to-end тестирования:

- **Аутентификация** - автоматическая setup-фаза создает тестового пользователя и сохраняет состояние аутентификации
- **Параллельное тестирование** - тесты запускаются на Chromium, Firefox и WebKit
- **Изоляция тестов** - каждый тестовый запуск использует уникального пользователя с временной меткой
- **Автоматическая очистка** - teardown-фаза удаляет тестовые данные после прогона

##### Структура тестов

- `tests/e2e/auth.setup.ts` - начальная аутентификация и сохранение состояния
- `tests/e2e/helpers/auth.ts` - вспомогательные функции для аутентификации
- `tests/e2e/*.spec.ts` - тестовые сценарии
- `tests/e2e/*.unauth.spec.ts` - тесты для неаутентифицированных пользователей
- `tests/e2e/cleanup.teardown.spec.ts` - очистка тестовых данных через API

##### Запуск тестов

```bash
# Запуск всех e2e тестов
pnpm run test:e2e

# Запуск в режиме отладки с UI
pnpm run test:e2e:ui

# Запуск тестов с видимым браузером
pnpm run test:e2e:headed
```

##### Покрытие тестами

- **Главная страница** - отображение и навигация для неаутентифицированных пользователей
- **Страница бюджета** - доступ, отображение информации пользователя, UI создания бюджета
- **Общие компоненты** - кнопки шаринга, выпадающее меню пользователя

### Frontend Architecture Principles

#### Server-Side Rendering (SSR) with Complete Data Preloading
- **No lazy loading** - all required data is fetched and rendered server-side
- **Full data hydration** on initial page load
- **Optimized Time to First Byte (TTFB)** and First Contentful Paint (FCP)
- **SEO-friendly** with complete content available for crawlers

#### API Calls in SSR Context
- **useFetch for SSR** - Use `useFetch` for GET requests that need cookie/header forwarding during SSR
- **$fetch for client operations** - Use `$fetch` for client-only POST/PUT/DELETE operations
- **Cloudflare Workers compatibility** - `$fetch` doesn't properly forward cookies during SSR in CF Workers

#### Optimistic UI Updates
The application uses **Optimistic UI** pattern for modal interactions:

- **Parallel state persistence** - UI updates immediately while backend saves asynchronously
- **No reload required** - frontend state reflects changes instantly
- **Graceful error handling** - rollback on failure with user notification
- **Enhanced UX** - zero perceived latency for user interactions

#### Dynamic Column Width Synchronization
Budget timeline implements **responsive column width synchronization**:

- **Content-based sizing** - columns automatically adjust to fit the widest content
- **Cross-row synchronization** - all rows maintain uniform column widths
- **Dynamic updates** - responds to content changes via ResizeObserver and reactive watchers
- **Smooth animations** - animated transitions between width changes
- **Flexible content containers** - inner elements (.column-content) with `w-fit` maintain natural sizing while parent containers receive synchronized fixed widths

## Tech Stack

- **Framework**: Nuxt 4, Vue 3
- **Backend**: Nitro, Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Authentication**: JWT with secure HTTP-only cookies, Google OAuth
- **Styling**: Tailwind CSS 4 + DaisyUI 5
- **Type Safety**: TypeScript 5 with strict mode
- **Validation**: Zod for runtime type checking
- **State Management**: Pinia
- **Charts**: Vue ECharts
- **Internationalization**: @nuxtjs/i18n (Russian, English)
- **Deployment**: Cloudflare Workers

## Getting Started

### Prerequisites

- Node.js 20.16.0 (pinned in package.json)
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

#### DISABLE_EMAIL_VERIFICATION

Disables mandatory email verification during registration. Useful for development and testing.

**Behavior**:
- **Disabled** (default, empty or unset): Registration requires email confirmation via verification code
- **Enabled** (any truthy value): Registration happens immediately without sending a code. User is created with `emailVerified = false`

**Usage**:

```bash
# In .dev.vars for local development
DISABLE_EMAIL_VERIFICATION=1
# or
DISABLE_EMAIL_VERIFICATION=true
# or any non-empty value

# Via wrangler for remote environments
wrangler secret put DISABLE_EMAIL_VERIFICATION
# Enter any truthy value: 1, true, yes, etc.
```

**Important**: All users have an `emailVerified` field in the database that indicates whether their email has been verified. This allows requiring verification from users with `emailVerified = false` in the future.

#### Google OAuth

To enable Google OAuth authentication:

```bash
# In .dev.vars for local development
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret

# Via wrangler for remote environments
wrangler secret put GOOGLE_OAUTH_CLIENT_ID
wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
```

**Setup in Google Cloud Console**:
1. Create a new project or select an existing one
2. Enable Google+ API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `https://your-domain.com/api/auth/google-redirect`

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

This creates a file like `migrations/0003_migration_name.sql`

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

### Database Commands

| Command | Purpose | Environment |
|---------|---------|-------------|
| `pnpm run db:migrate` | Apply migrations | Local |
| `pnpm run db:migrate:test` | Apply migrations | Test (remote) |
| `pnpm run db:migrate:prod` | Apply migrations | Production (remote) |
| `pnpm run db:backup` | Create backup | Local |
| `pnpm run db:backup:test` | Create backup | Test (remote) |
| `pnpm run db:backup:prod` | Create backup | Production (remote) |
| `pnpm run db:reset` | Reset database | Local only |

### Important Notes

- **NO Drizzle-kit generate** - we use Wrangler D1 migrations
- **Manual SQL** - write migrations manually in SQL
- **Test first** - always test migrations locally before deploying
- **Commit migrations** to version control

## Code Quality

### Проверка качества кода

```bash
# Run TypeScript checks
pnpm run typecheck

# Run linting
pnpm run lint

# Auto-fix ESLint issues
pnpm run lint:fix
```

### Deploy Commands

```bash
# Deploy to test
pnpm run deploy:test

# Deploy to production
pnpm run deploy:prod
```

After deployment:
- Test: `https://dom-cash-test.{account}.workers.dev`
- Production: `https://dom-cash.{account}.workers.dev`

## Development Commands

```bash
# Development
pnpm run dev            # Start dev server
pnpm run build          # Build for production

# Database operations
pnpm run db:migrate     # Apply migrations locally
pnpm run db:migrate:test # Apply to test DB
pnpm run db:migrate:prod # Apply to production DB
pnpm run db:backup      # Backup local DB
pnpm run db:reset       # Reset local DB

# Deployment
pnpm run deploy:test    # Deploy to test environment
pnpm run deploy:prod    # Deploy to production

# Code quality
pnpm run lint:fix       # Auto-fix ESLint issues
pnpm run typecheck      # Check TypeScript errors

# E2E testing
pnpm run test:e2e       # Run all e2e tests
pnpm run test:e2e:ui    # Run tests with interactive UI
pnpm run test:e2e:headed # Run tests with visible browser
```

## Project Structure

```
├── app/
│   ├── components/     # Vue components
│   ├── composables/    # Vue composables (frontend-only)
│   ├── pages/          # Nuxt pages
│   ├── stores/         # Pinia state management
│   ├── layouts/        # Page layouts
│   ├── middleware/     # Nuxt middleware
│   ├── plugins/        # Nuxt plugins
│   └── utils/          # Frontend utilities
├── server/
│   ├── api/            # Thin API handlers (HTTP adapters)
│   ├── services/       # Pure business logic (fully tested)
│   ├── db/             # Database schema and connection
│   ├── utils/          # Backend utilities (auth, validation)
│   └── schemas/        # Zod validation schemas
├── shared/
│   ├── types/          # Shared TypeScript types
│   ├── schemas/        # Shared Zod schemas
│   └── utils/          # Shared business logic
├── i18n/
│   └── locales/        # Translation files (ru, en)
```

## Known Issues

### Real-time Notifications (SSE) Not Production-Ready for Cloudflare Workers

**Problem**: The current SSE (Server-Sent Events) implementation stores active connections and budget subscriptions in global `Map` objects (`server/services/notifications.ts`). This architecture doesn't scale in Cloudflare Workers environment:

- **Memory isolation**: Each Worker instance has isolated memory, connections on Worker A are invisible to Worker B
- **Request distribution**: Multiple Worker instances handle requests simultaneously, causing notification delivery failures
- **Lost subscriptions**: User subscriptions and connections will be lost when requests hit different instances

**Impact**:
- Works correctly in development (single instance)
- Works for low-traffic deployments (single Worker instance)
- Fails under load when Cloudflare scales to multiple instances

**Solution Plan**:
1. Migrate connection state to **Cloudflare Durable Objects** (available on free tier)
2. Create a Durable Object class to manage SSE connections per user/budget
3. Update `server/services/notifications.ts` to use Durable Object stubs instead of Maps
4. Update `server/api/notifications/events.get.ts` to connect through Durable Object
5. Add Durable Object binding configuration to `wrangler.toml`

**Estimated effort**: 1-2 hours

**References**:
- [Cloudflare Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [Durable Objects Free Tier](https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier/)

## Contributing

### Development Guidelines

1. **Services** - All business logic goes in `server/services/` as pure functions
2. **Handlers** - Keep API handlers thin, only handle HTTP concerns
3. **TypeScript** - Follow strict mode, no `any` types
4. **Code Style** - Use ESLint, follow existing patterns

### Before Submitting PR

```bash
# Check TypeScript
pnpm run typecheck

# Fix linting issues
pnpm run lint:fix
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

The application supports multiple DaisyUI themes:

- **light** - Light theme (default)
- **dark** - Dark theme
- **autumn** - Warm autumn colors
- **nord** - Nord color palette
- **valentine** - Pink/red theme
- **coffee** - Coffee-inspired dark theme

### Theme Switching

Theme preference is stored in localStorage and applied via the `data-theme` attribute on the HTML element. Users can switch themes using the theme switcher in the header.
