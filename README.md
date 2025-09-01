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

Тестирование будет реализовано с помощью e2e тестов в будущем.

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
- **Authentication**: JWT with secure HTTP-only cookies
- **Styling**: Tailwind CSS + DaisyUI
- **Type Safety**: TypeScript with strict mode
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

## Cloudflare Deployment

### Initial Setup

1. **Login to Cloudflare**
```bash
wrangler login
```

2. **Create D1 databases** in Cloudflare Dashboard:
- `dom-test` - for testing
- `dom-prod` - for production

3. **Update database IDs** in `wrangler.toml`

4. **Set secrets**
```bash
# Test environment
wrangler secret put JWT_SECRET --env=""

# Production environment
wrangler secret put JWT_SECRET --env production
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
```

## Project Structure

```
├── app/
│   ├── components/     # Vue components
│   ├── composables/    # Vue composables (frontend-only)
│   ├── pages/          # Nuxt pages
│   └── utils/          # Frontend utilities
├── server/
│   ├── api/            # Thin API handlers (HTTP adapters)
│   ├── services/       # Pure business logic (fully tested)
│   ├── db/             # Database schema and connection
│   ├── utils/          # Backend utilities (auth, validation)
│   └── schemas/        # Zod validation schemas
├── shared/
│   ├── types/          # Shared TypeScript types
│   └── utils/          # Shared business logic
```

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
