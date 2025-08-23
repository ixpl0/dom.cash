# Dom Cash - Budget Tracker

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

#### Unit Testing (Backend Services)
- **Pure function testing** - services tested in Node.js environment with full mocks
- **Complete isolation** - database, crypto, and external dependencies mocked
- **Fast execution** - no real database or network calls

#### Integration Testing (API Endpoints)
- **End-to-end API testing** - using `@nuxt/test-utils/e2e` with real Nuxt runtime
- **Authentication testing** - real session management with HTTP-only cookies
- **Database integration** - tests use isolated test database with cleanup
- **50 integration tests** covering all API endpoints and user flows

### Frontend Architecture Principles

#### Server-Side Rendering (SSR) with Complete Data Preloading
- **No lazy loading** - all required data is fetched and rendered server-side
- **Full data hydration** on initial page load
- **Optimized Time to First Byte (TTFB)** and First Contentful Paint (FCP)
- **SEO-friendly** with complete content available for crawlers

#### Optimistic UI Updates
The application uses **Optimistic UI** pattern for modal interactions:

- **Parallel state persistence** - UI updates immediately while backend saves asynchronously
- **No reload required** - frontend state reflects changes instantly
- **Graceful error handling** - rollback on failure with user notification
- **Enhanced UX** - zero perceived latency for user interactions

## Tech Stack

- **Framework**: Nuxt 4, Vue 3
- **Backend**: Nitro, Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Authentication**: JWT with secure HTTP-only cookies
- **Styling**: Tailwind CSS + DaisyUI
- **Testing**: Vitest with comprehensive unit test suite
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

## Testing

### Running Tests

```bash
# Run all unit tests (services only)
pnpm run test:unit:run

# Run unit tests with coverage
pnpm run test:unit:cov

# Run integration tests (API endpoints)
pnpm run test:nuxt

# Run all tests
pnpm run test

# Run TypeScript checks
pnpm run typecheck

# Run linting
pnpm run lint
```

### Test Architecture

#### Unit Tests (`tests/unit/`)
- **Services testing** - all `server/services/` functions with complete mocks
- **Utilities testing** - `server/utils/` and `shared/utils/` functions
- **Schema testing** - Zod validation schemas
- **Node.js environment** - fast execution without Nuxt overhead

#### Integration Tests (`tests/nuxt/`)
- **API endpoint testing** - real HTTP requests to Nuxt runtime
- **Authentication flows** - login, logout, session management
- **CRUD operations** - budget months, entries, sharing
- **Permission testing** - read/write access validation
- **Error handling** - 400/401/403/404 responses

### Test Categories

1. **Services** (`server/services/`) - Business logic functions (100% coverage goal)
2. **Authentication** - Session management, password hashing, JWT handling
3. **Database Operations** - CRUD with proper error handling
4. **API Integration** - Full request/response cycle testing
5. **Shared Utilities** - Cross-platform business logic functions

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

# Testing
pnpm run test           # Run all tests
pnpm run test:ui        # Open Vitest UI
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
└── tests/
    ├── unit/           # Unit tests (services + utils)
    └── nuxt/           # Integration tests (API endpoints)
        └── helpers/    # Test utilities (auth, database)
```

## Contributing

### Development Guidelines

1. **Services** - All business logic goes in `server/services/` as pure functions
2. **Handlers** - Keep API handlers thin, only handle HTTP concerns
3. **Testing** - Write unit tests for services, integration tests for APIs
4. **Coverage** - Maintain 80%+ backend coverage (services + utils)
5. **TypeScript** - Follow strict mode, no `any` types
6. **Code Style** - Use ESLint, follow existing patterns

### Testing Requirements

- **Unit tests** for all new services functions
- **Integration tests** for new API endpoints
- **Authentication tests** for protected routes
- **Error handling tests** for all failure scenarios

#### Test Structure Rules

- **Mirror structure** - tests must follow the same directory structure as source code
- **Naming convention** - test files should be named `{original-name}.test.ts`
- **Examples**:
  - `server/services/months.ts` → `tests/unit/server/services/months.test.ts`
  - `server/api/auth/me.get.ts` → `tests/unit/server/api/auth/me.get.test.ts`
  - Special logic tests can have descriptive suffixes: `months-logic.test.ts`

### Before Submitting PR

```bash
# Ensure all tests pass
pnpm run test

# Check TypeScript
pnpm run typecheck

# Fix linting issues
pnpm run lint --fix

# Verify coverage
pnpm run test:unit:cov
```
