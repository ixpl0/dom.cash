# Budget Management Application

A modern budget tracking application built with Nuxt 4, featuring comprehensive backend testing and optimized frontend architecture.

## Architecture Overview

### Backend Testing Strategy

The application implements **Complete Unit Testing with Full Isolation** - a testing approach where every backend function is tested in complete isolation using comprehensive mocks. This ensures:

- **Full dependency mocking** - database, external APIs, and framework functions
- **Pure function testing** - each function tested independently without side effects
- **Fast test execution** - no real database or network calls during testing

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
pnpm run db:update
```

### Development

```bash
pnpm run dev
```

Visit `http://localhost:3000`

## Testing

### Running Tests

```bash
# Run all unit tests
pnpm run test:unit:run

# Run tests with coverage
pnpm run test:unit:cov

# Run TypeScript checks
pnpm run typecheck

# Run linting
pnpm run lint
```

### Test Architecture

- **Unit Tests**: `tests/unit/` - Complete isolation testing for backend logic
- **Nuxt Tests**: `tests/nuxt/` - Integration tests for frontend components (when needed)
- **Coverage Focus**: Backend-only coverage (excludes frontend from unit test metrics)

### Test Categories

1. **Server Utils** - Business logic, authentication, validation
2. **API Endpoints** - Auth and currency endpoints (budget endpoints excluded due to Nuxt dependencies)
3. **Database Schemas** - Type safety and structure validation
4. **Shared Utils** - Cross-platform business logic functions

## Development Commands

```bash
# Database operations
pnpm run db:generate    # Generate migrations
pnpm run db:migrate     # Run migrations
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
│   ├── api/            # API endpoints
│   ├── db/             # Database schema and connection
│   ├── utils/          # Backend utilities (100% tested)
│   └── schemas/        # Validation schemas
├── shared/
│   ├── types/          # Shared TypeScript types
│   └── utils/          # Shared business logic (98.4% tested)
└── tests/
    └── unit/           # Unit tests (backend-only)
```

## Contributing

1. All backend functions must have unit tests
2. Maintain 85%+ code coverage
3. Follow TypeScript strict mode
4. Use conventional commit messages
5. Ensure all tests pass before submitting PR
