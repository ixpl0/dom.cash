# AGENTS README

## Setup & Infrastructure

* **Node**: 22.12+ (`.nvmrc`, `engines` in `package.json`). pnpm is pinned via the `packageManager` field.
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
  * Every `deploy:*` script runs `pnpm run check` first.
* **Data layer**:
  * Cloudflare D1 (SQLite) for production
  * Local SQLite emulation via Wrangler for development
  * Drizzle ORM for type-safe queries (`server/db/schema.ts`)
  * Zod for validation
  * D1 allows at most 100 bound parameters per query: never bind id lists whose size depends on user data, use subqueries or joins instead (`server/utils/d1-limits.ts` chunks inserts).
  * Write multi-statement changes with `db.batch` so they are atomic.
* **Migrations**: Use Wrangler D1 migrations (`wrangler d1 migrations create`), NOT Drizzle-kit
  * Never drop or rebuild a table that other tables reference with `ON DELETE CASCADE`: SQLite deletes the child rows.
* **API Calls**:
  * Use `useFetch` for SSR-compatible GET requests that need cookie/header forwarding
  * Use `$fetch` for client-only operations (POST/PUT/DELETE)
  * In Cloudflare Workers, `$fetch` doesn't properly forward cookies during SSR
  * Pass query parameters through the `query` option so they are encoded.
* **Dates**: date-only values are `YYYY-MM-DD` strings. Use `shared/utils/shared/dates.ts` to get the local date and to format dates; `toISOString()` gives the UTC date.
* UI:
  * DaisyUI (https://daisyui.com/). All UI components should be based on DaisyUI.
  * Tailwind CSS (https://tailwindcss.com/). Try to avoid custom styles, use Tailwind classes instead.
  * **UI components** (`app/components/ui/`): Must be "dumb" — no business logic, only presentation. Pass callbacks/functions as props for any logic.
  * **Back button & Escape**: every overlay or edit mode must close on browser/mobile "back" before any page navigation. Register it with `useBackHandler(isEnabled, onBack)` (`app/composables/shared/useBackHandler.ts`): the latest enabled handler wins, `onBack` receives `'history'` or `'escape'`. `UiDialog` registers itself (so the confirmation modal treats back as cancel), DaisyUI focus dropdowns use `useDropdownBackHandler`. Ask via `useUnsavedChanges().confirmDiscardChanges` before discarding user input. History syncing lives in `app/utils/back-handlers.ts`.
* **State Management**: Pinia stores in `app/stores/`
* **i18n**: @nuxtjs/i18n with `strategy: 'no_prefix'`. Locales: `en`, `ru`. Files in `i18n/locales/` directory.
* **Icons**: @nuxt/icon with @iconify-json/heroicons
* **Excel import/export**: xlsx-js-style, loaded only when exporting
* **Charts**: ECharts via vue-echarts
* **Linting**: Husky + lint-staged for pre-commit hooks
* **Real-time Notifications**: Server-Sent Events (SSE) via `useNotifications` composable.
  * **Known limitation (accepted)**: SSE state (`activeConnections`, `budgetSubscriptions`) lives in a module-level `Map` in `server/services/notifications.ts`. In Cloudflare Workers there is no guarantee of a single isolate, so parallel viewers landing in different isolates may not receive each other's events. This is intentional and not considered critical — best-effort delivery is acceptable; do not "fix" by introducing Durable Objects without explicit ask.
* Commands:
  * `pnpm check` — lint, type-check the app and the tests, run unit tests (run before committing)
  * `pnpm typecheck` / `pnpm typecheck:tests` — type-check the app / the tests
  * `pnpm lint` / `pnpm lint:fix` — run ESLint
  * `pnpm test:unit` — run unit tests (Node test runner via tsx, no server needed)
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
  * `plugins/` — Nuxt plugins (auth, favicon, animate-on-scroll, back-handlers)
  * `stores/` — Pinia stores organized by feature (budget/, todo/, preferences)
  * `types/` — App-specific type definitions
  * `utils/` — Client-side utilities
* `server/` — Nitro server
  * `api/` — API routes (auth/, budget/, todo/, notifications/, user/, admin/, test/ — the test routes exist only in development)
  * `db/` — Database schema (`schema.ts`) and index
  * `services/` — Business logic services (auth/, budget/, notifications)
  * `middleware/` — Server middleware (content-validation, impersonation-guard)
  * `types/` — Server-specific type definitions (Cloudflare D1)
  * `utils/` — Server-side utilities
* `migrations/` — Wrangler D1 SQL migration files
* `shared/` — Shared between client and server (isomorphic code)
  * `schemas/` — Zod validation schemas (auth, common, recurrence)
  * `types/` — TypeScript types (budget, todo, i18n, recurrence, export-import)
  * `utils/` — Shared utilities (budget calculations, recurrence, currencies, dates)
* `tests/unit/` — Unit tests (`*.test.ts`, Node test runner)
* `tests/e2e/` — Playwright E2E tests
  * `public/` — Tests for public pages
  * `authenticated/` — Tests for authenticated pages (budget/, todo/)
  * `helpers/` — Test helpers (auth, confirmation, budget-setup, wait-for-hydration, text, users)
  * `fixtures.ts` — Test fixtures (one registered user per worker)
  * `fixtures/budgets/` — JSON budget fixtures for import tests
  * `constants.ts` — Test constants
  * `global-setup.ts` / `global-teardown.ts` — Clean `.auth/` before a run and delete test users after it
* `FOLLOWUPS.md` — Architecture review and maintenance backlog
* `PROJECT_REVIEW.md` — Bug review (P1/P2 items)

## Features

* **Budget**: Main budget management with months, entries (income/expense/balance), multi-currency support, import/export
* **Budget Sharing**: Share budgets with other users (read/write access)
* **Todo**: Task management with planned dates, recurrence patterns, sharing between users
* **Metrics**: Analytics dashboard with charts
* **Auth**: Email/password and Google OAuth, sliding sessions (90 days, refresh every 24h)
  * The email is the username. New emails are stored in lowercase; older accounts may keep mixed case, so look users up with `findUser` (`server/utils/auth.ts`), which ignores case.

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

* **Unit Tests**: `tests/unit/*.test.ts`, run with `pnpm test:unit`. Cover pure logic in `shared/` and server services with a fake D1. Compute expected values by hand, never copy them from the output; record known bugs as `{ todo: 'reason' }` tests with the correct expectation.
* **E2E Tests**: Use Playwright with TypeScript
  * Playwright reuses a dev server on port 8787 (`pnpm preview:e2e`) and starts one if none is running.
  * Only Desktop Chrome is configured. Tests retry only on CI.
* **Test structure**: `tests/e2e/` with `public/` for public pages and `authenticated/` for pages requiring auth
* **Element Selection**: Always use `data-testid` attributes for element selection in tests (for future internationalization support)
  * Use `page.getByTestId('element-id')` instead of text-based selectors
  * Never use `getByRole`, `getByText`, or other text-dependent selectors
* **Test helpers**: Use helpers from `tests/e2e/helpers/` for common operations (auth, confirmations, budget setup). Create test emails with `createTestEmail` so cleanup finds them.
