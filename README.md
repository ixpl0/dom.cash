# Budget Management Application

A modern budget tracking application built with Nuxt 4, featuring comprehensive backend testing and optimized frontend architecture.

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

- **Framework**: Nuxt 4
- **Database**: SQLite with Drizzle ORM
- **Authentication**: JWT with secure HTTP-only cookies
- **Styling**: Tailwind CSS + DaisyUI
- **Testing**: Vitest with comprehensive unit test suite
- **Type Safety**: TypeScript with strict mode

## Getting Started

### Prerequisites

- Node.js 20.16.0 (pinned in package.json)
- pnpm 10+

### Installation

```bash
pnpm install
```

### Database Setup

```bash
# For new projects or clean setup
pnpm run db:migrate

# Or reset database completely (deletes all data!)
pnpm run db:reset

# Generate migrations from schema changes + apply them
pnpm run db:update
```

### Development

```bash
pnpm run dev
```

Visit `http://localhost:3000`

## Database Migrations

This project uses **Drizzle migrations** to manage database schema changes safely without losing data.

### How Migrations Work

- **Schema changes** are tracked in `server/db/schema.ts`
- **Migration files** are generated in `drizzle/` directory
- **Applied migrations** are tracked in database to prevent re-running

### Migration Workflow

```bash
# 1. Make changes to server/db/schema.ts
# 2. Generate migration file
pnpm run db:generate

# 3. Review generated SQL in drizzle/ folder
# 4. Apply migration to database
pnpm run db:migrate
```

### Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `pnpm run db:generate` | Create migration from schema changes | After modifying `schema.ts` |
| `pnpm run db:migrate` | Apply pending migrations | After generating new migrations |
| `pnpm run db:update` | Generate + apply migrations in one step | Full development workflow |
| `pnpm run db:backup` | Create database backup | Before risky operations |
| `pnpm run db:reset` | **⚠️ Destroys all data** - auto-backup + recreate DB | For development/testing only |
| `pnpm run db:studio` | Open visual database browser | Inspect data and schema |

### Example: Adding a New Column

```typescript
// 1. Edit server/db/schema.ts
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(), // ← New column
  // ... other fields
})

// 2. Generate migration
// pnpm run db:generate

// 3. Apply migration  
// pnpm run db:migrate
```

### Migration Files

The project currently has these migrations:
- `0000_initial.sql` - Initial database schema (tables, indexes)
- `0001_initial_data.sql` - Initial currency rates data

### Database Backups

The project includes automatic SQLite backup using `VACUUM INTO`:

```bash
# Manual backup
pnpm run db:backup

# Automatic backup (before db:reset)
pnpm run db:reset
```

Backups are stored in `./backups/db-YYYY-MM-DDTHH-MM-SS.sqlite`

### Important Notes

- **Never edit migration files** manually - always use `db:generate`
- **Backups are created automatically** before `db:reset`
- **Test migrations on development data** first
- **Commit migration files** to version control
- **Migrations are applied automatically** by `db:migrate` in correct order

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

## Development Commands

```bash
# Database operations
pnpm run db:generate    # Generate migration from schema changes
pnpm run db:migrate     # Apply migrations to database
pnpm run db:update      # Generate + apply migrations in one step
pnpm run db:backup      # Create database backup
pnpm run db:reset       # Auto-backup + delete database and recreate
pnpm run db:studio      # Open Drizzle Studio

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
