# AGENTS README

## Setup & Infrastructure

* **Node**: 22.16+ (`.nvmrc`, `engines` in `package.json`; unit tests use `node:sqlite`). pnpm is pinned via the `packageManager` field.
* **Package manager**: pnpm 10.
* **Framework**: Nuxt 4 (https://nuxt.com/docs/getting-started/introduction).
* **Language**: TypeScript 5 (https://www.typescriptlang.org/docs/).
* **Deployment**: Cloudflare Workers with D1 database.
* **Settings**: the server reads secrets and flags from `process.env` (`.env` locally, see `.env.example`; Worker secrets when deployed, exposed through `nodejs_compat`). Only bindings such as `DB` and the R2 bucket `DOCS_BUCKET` come from `event.context.cloudflare.env`.
* Commands:
  * `pnpm i`
  * `pnpm run db:migrate` (local) / `pnpm run db:migrate:test` (remote) / `pnpm run db:migrate:prod` (production)
  * `pnpm run dev` (local) / `pnpm run deploy:test` (test) / `pnpm run deploy:prod` (production)
  * `pnpm run db:backup` / `pnpm run db:backup:test` / `pnpm run db:backup:prod` — backup database into `backups/backup-<target>-<UTC time>.sql` (never overwrites an older backup)
  * `pnpm run db:reset` — reset local database (deletes local D1 state and re-migrates)
  * `pnpm run deploy:all` — deploy to test and production
  * `pnpm run release:test` / `pnpm run release:prod` — check and build, then back up the database, apply migrations and deploy
  * Every `deploy:*` script runs `pnpm run check` first.
* **Data layer**:
  * Cloudflare D1 (SQLite) for production
  * Local SQLite emulation via Wrangler for development
  * Drizzle ORM for type-safe queries (`server/db/schema.ts`)
  * Zod for validation
  * D1 allows at most 100 bound parameters per query: never bind id lists whose size depends on user data, use subqueries or joins instead (`server/utils/d1-limits.ts` chunks inserts).
  * Write multi-statement changes with `db.batch` so they are atomic.
  * Cloudflare R2 (`DOCS_BUCKET`, `server/services/docs/storage.ts`) keeps the photos of the docs section; `wrangler dev` and `nuxt dev` emulate it in `.wrangler/`.
* **Migrations**: Use Wrangler D1 migrations (`wrangler d1 migrations create`), NOT Drizzle-kit
  * Never drop or rebuild a table that other tables reference with `ON DELETE CASCADE`: SQLite deletes the child rows.
* **API Calls**:
  * Stores load data in a `load` action with `useRequestFetch()`: during SSR it forwards the request cookies, in the browser it is `$fetch`. Call it before the first `await` of the action.
  * Never call `useFetch` or `useAsyncData` inside store actions: outside a component they keep the first response for the whole session.
  * Pages start loading with `await callOnce(key, () => store.load(), { mode: 'navigation' })`: it runs during SSR, is skipped during hydration and runs again on every client navigation.
  * Keep data fresh with the store's `markStale()`: the `live-data` plugin reloads stale stores in place when the tab is visible and no overlay or edit mode is open, and marks data older than 15 minutes stale. Do not reload the whole app to refresh data.
  * Use `$fetch` for mutations (POST/PUT/DELETE).
  * Pass query parameters through the `query` option so they are encoded.
* **Errors**:
  * Throw `createError({ statusCode, message: ERROR_KEYS.X })` with a key from `shared/utils/shared/error-keys.ts`. Every key needs a `serverErrors` translation in both locales (a unit test checks it).
  * Validate input with `parseBody` / `parseQuery` (`server/utils/validation.ts`): they answer 400 with an error key and list the failed fields in `data.issues`.
  * Request schemas live in `shared/schemas` (auth, budget, todo, common): the server parses requests with them and forms check the same schemas before sending. Budget years are 2000–2100; income and expense amounts are greater than zero, a balance may be zero.
  * Derive types from the schemas (`z.infer`) and enums from `ENTRY_KINDS` / `ACCESS_LEVELS` (`shared/schemas/common.ts`), which the Drizzle schema uses too. `shared/` never imports from `server/`.
  * Show errors with `useServerError().formatError(error, fallback)`: it translates error keys and shows the fallback for anything else.
* **Dates**: date-only values are `YYYY-MM-DD` strings. Use `shared/utils/shared/dates.ts` to get the local date and to format dates; `toISOString()` gives the UTC date. Components take the current month from `useCurrentMonth()`: it stays empty during server rendering and hydration, then follows the clock. The server cannot know the user's time zone, so it treats a month as past only once it has ended everywhere (`hasMonthEndedEverywhere`).
* **Money**: amounts are stored as entered, from 0 up to `MAX_AMOUNT` (`shared/schemas/common.ts`). Show them with `useMoneyFormat` (up to 2 decimals, BTC up to 8, metals up to 4; the rounded format drops cents) and take the sign for colours and "+" from `getShownSign`, so a value shown as 0 is never coloured as a gain or a loss.
* UI:
  * DaisyUI (https://daisyui.com/). All UI components should be based on DaisyUI.
  * Tailwind CSS (https://tailwindcss.com/). Try to avoid custom styles, use Tailwind classes instead.
  * **UI components** (`app/components/ui/`): no business logic, only presentation. They translate their own fixed texts with `useI18n()`; pass data, texts that depend on the context (such as tooltips that differ between the budget and the landing page) and callbacks for any logic as props.
  * **Modals** are built on `UiDialog`: pass `title` (or the `title` slot) and `close-button-test-id` instead of drawing the heading and the close button.
  * **Back button & Escape**: every overlay or edit mode must close on browser/mobile "back" before any page navigation. Register it with `useBackHandler(isEnabled, onBack)` (`app/composables/shared/useBackHandler.ts`): the latest enabled handler wins, `onBack` receives `'history'` or `'escape'`. `UiDialog` registers itself (so the confirmation modal treats back as cancel), DaisyUI focus dropdowns use `useDropdownBackHandler`. Ask via `useUnsavedChanges().confirmDiscardChanges` before discarding user input. History syncing lives in `app/utils/back-handlers.ts`.
* **State Management**: Pinia stores in `app/stores/`. Keep other shared state in `useState` (as `useToast` does): a module-level `ref` is shared by every request the server renders, so it may only hold state that is written in the browser.
* **i18n**: @nuxtjs/i18n with `strategy: 'no_prefix'`. Locales: `en`, `ru`. Files in `i18n/locales/` directory.
  * `useI18n()` works only at the top of a component `setup`. Code that stores or plugins may call uses `useT()` (`app/utils/i18n.ts`), which reads the global `$i18n`.
  * Russian messages with a count list three forms, `one | few | many` (`{count} минуту | {count} минуты | {count} минут`); `i18n/plural-rules.ts` picks the form.
  * `ru.ts` is checked against `en.ts` (`satisfies typeof en`): add and remove every key in both files, and delete keys the code no longer uses.
  * Email texts live in `server/utils/email.ts`; a code email goes out in the interface language (`LOCALE_COOKIE_NAME`). The Excel export gets `t` and the month names, so it follows the interface language too.
* **Icons**: @nuxt/icon with @iconify-json/heroicons
* **Excel import/export**: xlsx-js-style, loaded only when exporting (`useBudgetExport`)
* **Charts**: ECharts via vue-echarts
* **Linting**: Husky + lint-staged for pre-commit hooks
* **Real-time Notifications**: Server-Sent Events (SSE) handled by the `live-data` client plugin (`app/plugins/live-data.client.ts`).
  * One connection per tab while signed in. After every (re)connect the plugin subscribes again to the budget the page watches (`useLiveBudget`), because the server drops subscriptions with the last connection.
  * An event shows a toast and marks the affected store stale (`app/utils/notifications.ts` decides which); a reconnect marks everything stale because events may have been missed. Silent events (`docs_images_changed`) only mark the store stale.
  * **Known limitation (accepted)**: SSE state (`activeConnections`, `budgetSubscriptions`) lives in a module-level `Map` in `server/services/notifications.ts`. In Cloudflare Workers there is no guarantee of a single isolate, so parallel viewers landing in different isolates may not receive each other's events. This is intentional and not considered critical — best-effort delivery is acceptable; do not "fix" by introducing Durable Objects without explicit ask.
* Commands:
  * `pnpm check` — lint, type-check the app and the tests, run unit tests (run before committing)
  * `pnpm typecheck` / `pnpm typecheck:tests` — type-check the app / the tests
  * `pnpm lint` / `pnpm lint:fix` — run ESLint
  * `pnpm test:unit` — run unit tests (Node test runner via tsx, no server needed)
  * `pnpm test:e2e` — build the app in e2e mode and run all Playwright tests against it
  * `pnpm test:e2e:dev` — run Playwright tests against the dev server (`pnpm preview:e2e`), handy while writing a test. That server loads `.env.e2e` instead of `.env` (usually there is none), so real keys such as `ANTHROPIC_API_KEY` never reach the tests
  * `pnpm test:e2e:ui` / `pnpm test:e2e:headed` — the same against the dev server, with UI mode / a visible browser

## Project Structure

* `app/` — Nuxt application
  * `pages/` — Pages: index (landing), auth, budget, metrics, todo, docs
  * `components/` — Vue components organized by feature (budget/, todo/, docs/, ui/, etc.)
  * `composables/` — Composables organized by feature (auth/, budget/, docs/, shared/)
  * `layouts/` — Nuxt layouts (default.vue)
  * `middleware/` — Client middleware (auth.global.ts)
  * `plugins/` — Nuxt plugins (auth, favicon, animate-on-scroll, back-handlers, live-data)
  * `stores/` — Pinia stores organized by feature (budget/, todo/, docs/, preferences)
  * `types/` — App-specific type definitions
  * `utils/` — Client-side utilities
* `server/` — Nitro server
  * `api/` — API routes (auth/, budget/, todo/, docs/, notifications/, user/, admin/, test/ — the test routes exist only in development)
  * `db/` — Database schema (`schema.ts`) and index
  * `services/` — Business logic services (auth/, budget/, docs/, connections, notifications, todo)
  * `middleware/` — Server middleware (content-validation, impersonation-guard)
  * `types/` — Server-specific type definitions (Cloudflare D1)
  * `utils/` — Server-side utilities
* `migrations/` — Wrangler D1 SQL migration files
* `shared/` — Shared between client and server (isomorphic code)
  * `schemas/` — Zod validation schemas (auth, budget, common, docs, export-import, recurrence, todo)
  * `types/` — TypeScript types (budget, todo, i18n, recurrence, export-import)
  * `utils/` — Shared utilities (budget calculations, recurrence, currencies, dates, error keys)
* `tests/unit/` — Unit tests (`*.test.ts`, Node test runner)
* `tests/e2e/` — Playwright E2E tests
  * `public/` — Tests for public pages
  * `authenticated/` — Tests for authenticated pages (budget/, todo/)
  * `mobile/` — Phone layout tests (Pixel 7 project)
  * `admin/` — Admin tests that change settings every test shares (`admin` project, runs after the others)
  * `helpers/` — Test helpers (auth, confirmation, budget-setup, docs, wait-for-hydration, text, users)
  * `fixtures.ts` — Test fixtures (one registered user per worker)
  * `fixtures/budgets/` — JSON budget fixtures for import tests
  * `constants.ts` — Test constants
  * `global-setup.ts` / `global-teardown.ts` — Clean `.auth/` before a run, delete test users and reset `app_settings` after it
  * `server.ts` — Starts the e2e build: recreates the local D1 in `.wrangler/e2e`, applies migrations, runs `wrangler dev`
* `FOLLOWUPS.md` — Deferred work and the decisions not to change things

## Features

* **Budget**: Main budget management with months, entries (income/expense/balance), multi-currency support, import/export
  * The store keeps months newest first: sort them with `sortMonthsNewestFirst` (`shared/utils/budget/month-helpers.ts`) and replace changed months instead of copying the whole budget.
  * Plans are whole numbers in the owner's main currency: `convertPlansToCurrency` (`server/services/budget/currency.ts`) converts them with the rates of their months when the main currency changes and when a file kept in another main currency is imported, and refuses with `NO_RATE_TO_CONVERT_PLANS` (nothing is changed) when a planned month has no rate for either currency.
  * The balance of a month is the savings on its first day, and its change to the next month's balance is what went out during the month. The balance modal says the date in its title, and from the 4th day of the current month it warns that new account balances belong to the next month (`isLateToEditStartBalance`, `shared/utils/budget/month-helpers.ts`).
  * A month's `id` (and every `monthId`) is its UUID. `createMonthKey(year, month)` gives the key `"2026-08"` that matches months and plans; the month index is zero-based, so that key is September.
* **Budget Sharing**: Share budgets with other users (read/write access)
* **Connections**: people who shared their budget with a user (`server/services/connections.ts`). Tasks and doc folders can be shared only with connections. A participant who stops being a connection stays until the owner removes them (`resolveSharedUsers`).
* **Todo**: Task management with planned dates, recurrence patterns, sharing between users
  * A task is overdue when it is open and planned for today or earlier (`isTodoOverdue`, `shared/utils/todo.ts`). The header count comes from the loaded list, or from `/api/todo/overdue-count` with the browser's local date, so server rendering never waits for tasks.
  * The checkbox sends the wanted state (`PUT /api/todo/:id/completion`), never a toggle, so a repeated request changes nothing; completing a recurring task moves it to its next date. A click while the request runs is ignored.
* **Docs**: folders (a person, a car, a home) hold documents; a document has photos and an ordered list of fields (`name`/`value`, JSON in `doc_document.fields`).
  * Access works like tasks: the owner shares a folder with connections, every participant can change and delete everything in it, only the owner changes the participants.
  * Photos live in R2 under `docs/<folderId>/<documentId>/<imageId>/<variant>`: the `original` as uploaded, a JPEG `preview` sized to the model's image limits (`getDocPreviewSize`: 2576 px on the long edge, 4784 visual tokens) for recognition and a JPEG `thumbnail` up to 480 px, enough for the card strip and the gallery tiles of the document page on a retina screen. The browser makes the preview and the thumbnail (`app/utils/doc-images.ts`) and sends the three files in one `application/octet-stream` body with their sizes in the query (`uploadDocImageQuerySchema`); the server checks magic bytes and never trusts a declared type. Photos are served only by `/api/docs/images/:id/:variant` after an access check, with `Cache-Control: private, no-cache` and an ETag, so the browser revalidates every time and gets a 304 instead of the file. Rows are deleted first, then files; a failed file deletion is only logged.
  * Workers Free gives a request 10 ms of CPU: never base64-encode or JSON-serialize photos on the server, pass them to R2 and to the Files API as they are.
  * Recognition (`server/services/docs/recognizer.ts`): the previews go to the Anthropic Files API one at a time, to keep the memory of the request small (they expire in an hour and are deleted after the answer), `claude-sonnet-5-5` returns the fields sorted by importance as structured output. The effort is chosen in the interface for now (`DocsRecognitionEffortSelect` next to the recognize button and in the upload modals, see `FOLLOWUPS.md`): `low` by default, remembered in the `user-preferences` cookie (`usePreferencesStore`), the docs store sends it with every recognition. `mergeRecognizedFields` (`shared/utils/docs.ts`) keeps every field the user already has and adds only new ones; mode `replace` replaces them. Without `ANTHROPIC_API_KEY` recognition is off, except in test mode, where a fake recognizer answers.
  * Uploads and recognition run in the docs store (`uploadImages`, `recognizeDocument`), so they go on after the modal closes; the page shows their progress. A folder reload that started before a local change is dropped and marks the store stale. Photos cannot be added in edit mode, because recognition would change the fields under the draft.
  * Limits are in `shared/schemas/docs.ts`. Recognition has no rate limit yet (decision of 28 September 2026, see `FOLLOWUPS.md`).
* **Metrics**: Analytics dashboard with charts
* **Auth**: Email/password and Google OAuth, sliding sessions (90 days, refresh every 24h)
  * The email is the username. New emails are stored in lowercase; older accounts may keep mixed case, so look users up with `findUser` (`server/utils/auth.ts`), which ignores case.
  * The session is restored only during server rendering (`app/plugins/auth.server.ts`). The browser keeps that user, sign-in updates it with `setUser`, logout reloads the app.
  * Sign-in, registration and password reset requests live in `useAuth`; `app/pages/auth.vue` only switches steps and shows messages. Validate fields with `getAuthFieldErrors` (`app/utils/auth-validation.ts`), which uses the schemas from `shared/schemas/auth.ts` that the server checks too.
  * Admins close and open registration on the metrics page, or open it for `TEMPORARY_REGISTRATION_MINUTES`; the state lives in the single-row `app_settings` table (`server/services/auth/registration.ts`), and without that row registration is open. Every route that creates a user (email code, direct registration, first Google sign-in) calls `assertRegistrationOpen`; the sign-in page shows a notice instead of the register button, and existing users sign in as usual.

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

* **Unit Tests**: `tests/unit/*.test.ts`, run with `pnpm test:unit`. Cover pure logic in `shared/`; test server services against `createTestDatabase()` (`tests/unit/helpers/test-database.ts`): an in-memory SQLite with all migrations that D1 code can use through `event`, and that counts the queries; its `docsBucket` is an in-memory R2 bucket. The Claude request is tested against a fake API that replaces `globalThis.fetch` (`tests/unit/docs-recognizer.test.ts`). Compute expected values by hand, never copy them from the output; record known bugs as `{ todo: 'reason' }` tests with the correct expectation.
* **E2E Tests**: Use Playwright with TypeScript
  * Docs tests prepare folders, documents and photos with `tests/e2e/helpers/docs.ts`; recognition in the e2e build uses the fake recognizer, so the tests need no API key.
  * `pnpm test:e2e` runs against a production-like build (`nuxt build --envName e2e` into `.output-e2e`) served by `wrangler dev` on port 8787, with a fresh local D1 in `.wrangler/e2e` on every run. `playwright.dev.config.ts` targets the dev server instead.
  * Test-only behaviour (verification code `111111`, codes logged instead of emailed, `/api/test/*` routes) is guarded by `isTestMode()` (`server/utils/test-mode.ts`): it is on in `nuxt dev` and in the e2e build; production builds replace the flag with `false` at build time.
  * Desktop Chrome runs `public/` and `authenticated/`; the `mobile` project (Pixel 7) runs `tests/e2e/mobile/`, which covers the mobile menu and cards. Tests retry only on CI.
  * The `admin` project runs `tests/e2e/admin/` only after all other projects pass, because its tests close registration that every worker needs to sign up. `grantAdmin` (`/api/test/grant-admin`) makes the worker user an admin; the tests open registration again after themselves.
  * Do not edit files or run Nuxt commands (typecheck, prepare, build) while `pnpm test:e2e` runs: `wrangler dev` rebuilds the worker and requests in flight fail with 503.
  * The e2e worker has no rates API key, so its only exchange rates are the ones the migrations seed: monthly up to 2025-08-01 (`0002_seed_currency_rates.sql`, with the August set replaced by `0003_fix_august_2025_rates.sql`). Months after that, including the 2099 fixtures, use the 2025-08-01 set: compute expected conversions from it (USD 1, EUR 0.875509).
* **Test structure**: `tests/e2e/` with `public/` for public pages, `authenticated/` for pages requiring auth, `mobile/` for the phone layout and `admin/` for admin settings
* **Element Selection**: Always use `data-testid` attributes for element selection in tests (for future internationalization support)
  * Use `page.getByTestId('element-id')` instead of text-based selectors
  * Never use `getByRole`, `getByText`, or other text-dependent selectors
* **Test helpers**: Use helpers from `tests/e2e/helpers/` for common operations (auth, confirmations, budget setup). Prepare data through the API, not through a screen the test does not check: `initBudget` imports a fixture with `/api/budget/import`. Create test emails with `createTestEmail` so cleanup finds them.
