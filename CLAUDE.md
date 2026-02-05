# Claude Instructions

## Setup & Infrastructure

* **Node**: 20.16.0
* **Package manager**: pnpm 10
* **Framework**: Nuxt 4.1.0 (https://nuxt.com/docs/getting-started/introduction)
* **Language**: TypeScript 5.9 (https://www.typescriptlang.org/docs/)
* **Deployment**: Cloudflare Workers with D1 database
* Commands:
  * `pnpm i`
  * `pnpm run db:migrate` (local) / `pnpm run db:migrate:test` (remote) / `pnpm run db:migrate:prod` (production)
  * `pnpm run db:reset` — reset local database (deletes and recreates)
  * `pnpm run dev` (local) / `pnpm run deploy:test` (test) / `pnpm run deploy:prod` (production)
  * `pnpm run db:backup` / `pnpm run db:backup:test` / `pnpm run db:backup:prod` — backup database
* **Data layer**:
  * Cloudflare D1 (SQLite) for production
  * Local SQLite emulation via Wrangler for development
  * Drizzle ORM for type-safe queries (`server/db/schema.ts`)
  * Zod for validation
* **Migrations**: Use Wrangler D1 migrations (`wrangler d1 migrations create`), NOT Drizzle-kit
* **API Calls**:
  * Use `useFetch` for SSR-compatible GET requests that need cookie/header forwarding
  * Use `$fetch` for client-only operations (POST/PUT/DELETE)
  * In Cloudflare Workers, `$fetch` doesn't properly forward cookies during SSR
* UI:
  * DaisyUI (https://daisyui.com/). All UI components should be based on DaisyUI.
  * Tailwind CSS (https://tailwindcss.com/). Try to avoid custom styles, use Tailwind classes instead.
  * **UI components** (`app/components/ui/`): Must be "dumb" — no business logic, only presentation. Pass callbacks/functions as props for any logic.
* **State Management**: Pinia stores in `app/stores/`
* **i18n**: @nuxtjs/i18n with `strategy: 'no_prefix'`. Locales: `en`, `ru`. Files in `i18n/locales/` directory.
* **Charts**: ECharts via vue-echarts (client-only components with `.client.vue` suffix)
* **Excel Export**: xlsx-js-style for styled Excel exports
* **Linting**: Husky + lint-staged for pre-commit hooks
* **Real-time Notifications**: Server-Sent Events (SSE) via `useNotifications` composable
* **Auto-refresh**: `useVisibilityRefresh` composable refreshes data when tab becomes visible after 5+ minutes
* Commands:
  * `pnpm typecheck` — run TypeScript type checking
  * `pnpm lint` / `pnpm lint:fix` — run ESLint
  * `pnpm test:e2e` — run Playwright tests
  * `pnpm test:e2e:ui` — run tests with Playwright UI
  * `pnpm test:e2e:headed` — run tests in headed browser mode

## Project Structure

* `app/` — Nuxt application
  * `pages/` — Pages: index (landing), auth, budget, metrics, todo
  * `components/` — Vue components organized by feature (budget/, todo/, ui/, etc.)
  * `composables/` — Composables organized by feature (auth/, budget/, shared/)
  * `stores/` — Pinia stores organized by feature (budget/, todo/, preferences)
  * `utils/` — Client-side utilities
* `server/` — Nitro server
  * `api/` — API routes
  * `db/` — Database schema (`schema.ts`) and index
  * `services/` — Business logic services
  * `middleware/` — Server middleware
  * `utils/` — Server-side utilities
* `shared/` — Shared between client and server (isomorphic code)
  * `schemas/` — Zod validation schemas (auth, common, recurrence)
  * `types/` — TypeScript types (budget, todo, i18n, recurrence)
  * `utils/` — Shared utilities (currencies, budget calculations)
  * `validators/` — Custom validators
* `tests/e2e/` — Playwright E2E tests
  * `public/` — Tests for public pages
  * `authenticated/` — Tests for authenticated pages (budget/, todo/)
  * `helpers/` — Test helpers (auth, confirmation, budget-setup)
  * `fixtures.ts` — Test fixtures

## Features

* **Budget**: Main budget management with months, entries (income/expense/balance), multi-currency support, import/export, balance runway calculations
* **Budget Sharing**: Share budgets with other users (read/write access)
* **Todo**: Task management with planned dates, sharing between users
  * Recurrence patterns: interval (day/week/month/year), weekdays, day of month
* **Metrics**: Analytics dashboard with charts (admin only)
* **Auth**: Email/password and Google OAuth, sliding sessions (90 days, refresh every 24h)

## Code Style (required)

* Rules:
  * Always use `const` where possible. Arrow functions.
  * Max immutability: don't mutate objects/arrays; avoid `push`/`pop`/`splice`, etc. Use `map`, `filter`, `reduce`, `concat`, `slice` instead.
  * **Never** use `any`. If needed, use `unknown` and narrow. Prefer generics when possible.
  * Destructure where appropriate. Prefer `map`/`filter`/`reduce` over `for/forEach` when suitable.
  * Every `if`/`else`/`for` must have a block (no one-liners).
  * **NEVER USE COMMENTS**. NEVER. Only use comments for disabling ESLint rules, or for TODOs.
  * Variables and functions should be simple and in simple English, but meaningful, self-explanatory and no abbreviations.
  * Add an empty line to the end of every new file.
  * Use Vue 3, Composition API, `<script setup lang="ts">`. Prefer `ref` over `reactive`.
  * Follow the existing ESLint and TS config.
  * Use `git mv` and `git rm` to keep git history.
  * **NEVER** add `Co-Authored-By` to commit messages.

## Testing

* **E2E Tests**: Use Playwright with TypeScript
* **Test structure**: `tests/e2e/` with `public/` for public pages and `authenticated/` for pages requiring auth
* **Element Selection**: Always use `data-testid` attributes for element selection in tests (for future internationalization support)
  * Use `page.getByTestId('element-id')` instead of text-based selectors
  * Never use `getByRole`, `getByText`, or other text-dependent selectors
* **Test helpers**: Use helpers from `tests/e2e/helpers/` for common operations (auth, confirmations, budget setup)
