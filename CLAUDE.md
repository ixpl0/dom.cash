# AGENTS README

## Setup & Infrastructure

* **Node**: 20+ (pnpm pinned via `packageManager` field in `package.json`).
* **Package manager**: pnpm 10.
* **Framework**: Nuxt 4 (https://nuxt.com/docs/getting-started/introduction).
* **Language**: TypeScript 5 (https://www.typescriptlang.org/docs/).
* **Deployment**: Cloudflare Workers with D1 database.
* Commands:
  * `pnpm i`
  * `pnpm run db:migrate` (local) / `pnpm run db:migrate:test` (remote) / `pnpm run db:migrate:prod` (production)
  * `pnpm run dev` (local) / `pnpm run deploy:test` (test) / `pnpm run deploy:prod` (production)
  * `pnpm run db:backup` / `pnpm run db:backup:test` / `pnpm run db:backup:prod` — backup database
  * `pnpm run db:reset` — reset local database (deletes local D1 state and re-migrates)
  * `pnpm run deploy:all` — deploy to test and production
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
* **Icons**: @nuxt/icon with @iconify-json/heroicons
* **Excel import/export**: xlsx-js-style
* **Charts**: ECharts via vue-echarts
* **Linting**: Husky + lint-staged for pre-commit hooks
* **Real-time Notifications**: Server-Sent Events (SSE) via `useNotifications` composable
* Commands:
  * `pnpm typecheck` — run TypeScript type checking
  * `pnpm lint` / `pnpm lint:fix` — run ESLint
  * `pnpm test:e2e` — run Playwright tests
  * `pnpm test:e2e:ui` — run Playwright tests with UI mode
  * `pnpm test:e2e:headed` — run Playwright tests in headed browser

## Project Structure

* `app/` — Nuxt application
  * `pages/` — Pages: index (landing), auth, budget, metrics, todo
  * `components/` — Vue components organized by feature (budget/, todo/, ui/, etc.)
  * `composables/` — Composables organized by feature (auth/, budget/, shared/)
  * `layouts/` — Nuxt layouts (default.vue)
  * `middleware/` — Client middleware (auth.global.ts)
  * `plugins/` — Nuxt plugins (auth, favicon, animate-on-scroll)
  * `stores/` — Pinia stores organized by feature (budget/, todo/, preferences)
  * `types/` — App-specific type definitions
  * `utils/` — Client-side utilities
* `server/` — Nitro server
  * `api/` — API routes (auth/, budget/, todo/, notifications/, user/, admin/)
  * `db/` — Database schema (`schema.ts`) and index
  * `services/` — Business logic services (auth/, budget/, notifications)
  * `middleware/` — Server middleware (content-validation)
  * `types/` — Server-specific type definitions (Cloudflare D1)
  * `utils/` — Server-side utilities
* `migrations/` — Wrangler D1 SQL migration files
* `shared/` — Shared between client and server (isomorphic code)
  * `schemas/` — Zod validation schemas (auth, common, recurrence)
  * `types/` — TypeScript types (budget, todo, i18n, recurrence)
  * `utils/` — Shared utilities (currencies, budget calculations)
* `tests/e2e/` — Playwright E2E tests
  * `public/` — Tests for public pages
  * `authenticated/` — Tests for authenticated pages (budget/, todo/)
  * `helpers/` — Test helpers (auth, confirmation, budget-setup, wait-for-hydration)
  * `fixtures.ts` — Test fixtures
  * `fixtures/budgets/` — JSON budget fixtures for import tests
  * `constants.ts` — Test constants
  * `cleanup.teardown.spec.ts` — Cleanup teardown

## Features

* **Budget**: Main budget management with months, entries (income/expense/balance), multi-currency support, import/export
* **Budget Sharing**: Share budgets with other users (read/write access)
* **Todo**: Task management with planned dates, recurrence patterns, sharing between users
* **Metrics**: Analytics dashboard with charts
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

## Testing

* **E2E Tests**: Use Playwright with TypeScript
* **Test structure**: `tests/e2e/` with `public/` for public pages and `authenticated/` for pages requiring auth
* **Element Selection**: Always use `data-testid` attributes for element selection in tests (for future internationalization support)
  * Use `page.getByTestId('element-id')` instead of text-based selectors
  * Never use `getByRole`, `getByText`, or other text-dependent selectors
* **Test helpers**: Use helpers from `tests/e2e/helpers/` for common operations (auth, confirmations, budget setup)
